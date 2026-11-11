import {
  collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import { obtenerSuscripciones, enviarNotificacionPush } from "./push";
import { avisoEstado } from "./avisos";
import type { EstadoPedido, Pedido } from "@/types";

const RESTAURANT_ID = "restaurante1";

export function pedidosRef() {
  return collection(db, "restaurantes", RESTAURANT_ID, "pedidos");
}

function mapearPedidos(
  snap: { docs: { id: string; data: () => DocumentData }[] }
): Pedido[] {
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
        fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
      }) as Pedido
  );
}

export function escucharDomiciliosListos(cb: (pedidos: Pedido[]) => void) {
  const q = query(
    pedidosRef(),
    where("tipo", "==", "DOMICILIO"),
    where("estado", "==", "LISTO")
  );
  return onSnapshot(q, (snap) => {
    cb(mapearPedidos(snap).filter((p) => !p.repartidorId));
  });
}

export function escucharMisEntregas(uid: string, cb: (pedidos: Pedido[]) => void) {
  const q = query(pedidosRef(), where("repartidorId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(mapearPedidos(snap));
  });
}

export async function aceptarPedido(
  pedidoId: string,
  repartidorId: string,
  repartidorNombre: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, "restaurantes", RESTAURANT_ID, "pedidos", pedidoId);
  const captura: { numero: number | null } = { numero: null };
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Pedido no existe");
      const data = snap.data();
      if (data.tipo !== "DOMICILIO") throw new Error("Solo domicilio");
      if (data.estado !== "LISTO") throw new Error("No disponible");
      if (data.repartidorId) throw new Error("Asignado");
      captura.numero = typeof data.numeroPedido === "number" ? data.numeroPedido : null;
      tx.update(ref, {
        repartidorId,
        repartidorNombre,
        aceptadoEn: serverTimestamp(),
      });
    });
    if (captura.numero !== null) {
      obtenerSuscripciones({ tipo: "admin" }).then((subs) =>
        enviarNotificacionPush(
          `🛵 Pedido #${captura.numero} aceptado`,
          `Repartidor: ${repartidorNombre}`,
          "/admin/pedidos",
          subs
        )
      );
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Asignado") {
      return { ok: false, error: "Este pedido ya fue asignado a otro repartidor." };
    }
    if (msg === "No disponible") {
      return { ok: false, error: "Este pedido ya no está disponible." };
    }
    if (msg === "Solo domicilio") {
      return { ok: false, error: "Pedido inválido." };
    }
    return { ok: false, error: "No se pudo aceptar el pedido. Intenta de nuevo." };
  }
}

export async function cambiarEstadoRepartidor(
  pedidoId: string,
  repartidorId: string,
  nuevoEstado: "EN_CAMINO" | "ENTREGADO"
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, "restaurantes", RESTAURANT_ID, "pedidos", pedidoId);
  const captura: { numero: number | null; uid: string | null } = { numero: null, uid: null };
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Pedido no existe");
      const data = snap.data();
      if (data.tipo !== "DOMICILIO") throw new Error("Solo domicilio");
      if (data.repartidorId !== repartidorId) throw new Error("No asignado");
      if (nuevoEstado === "EN_CAMINO" && data.estado !== "LISTO") throw new Error("Estado");
      if (nuevoEstado === "ENTREGADO" && data.estado !== "EN_CAMINO") throw new Error("Estado");
      captura.numero = typeof data.numeroPedido === "number" ? data.numeroPedido : null;
      captura.uid = typeof data.uid === "string" && data.uid ? data.uid : null;
      tx.update(ref, { estado: nuevoEstado });
    });
    const cuerpo = avisoEstado(nuevoEstado as EstadoPedido, "DOMICILIO");
    if (captura.uid) {
      obtenerSuscripciones({ uid: captura.uid }).then((subs) =>
        enviarNotificacionPush(
          `Pedido #${captura.numero}`,
          cuerpo,
          `/pedido?pedido=${pedidoId}`,
          subs
        )
      );
    }
    if (captura.numero !== null) {
      obtenerSuscripciones({ tipo: "admin" }).then((subs) =>
        enviarNotificacionPush(
          `Pedido #${captura.numero}`,
          cuerpo,
          "/admin/pedidos",
          subs
        )
      );
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo actualizar. Recarga e intenta de nuevo." };
  }
}
