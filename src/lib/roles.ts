import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { RolUsuario, UsuarioRol } from "@/types";

const RESTAURANT_ID = "restaurante1";
const INTENTOS = 3;
const ESPERA_MS = 400;

export function usuarioRolRef(uid: string) {
  return doc(db, "restaurantes", RESTAURANT_ID, "usuarios", uid);
}

export type ResultadoRol =
  | { estado: "ok"; usuario: UsuarioRol | null }
  | { estado: "error"; mensaje: string; codigo: string };

export type Membresia = UsuarioRol & { rid: string };

async function esperar() {
  await new Promise((r) => setTimeout(r, ESPERA_MS));
}

export async function consultarRolEn(
  rid: string,
  uid: string
): Promise<ResultadoRol> {
  let ultimo: unknown = null;
  for (let i = 0; i < INTENTOS; i++) {
    try {
      const snap = await getDoc(doc(db, "restaurantes", rid, "usuarios", uid));
      if (!snap.exists()) return { estado: "ok", usuario: null };
      return { estado: "ok", usuario: { uid, ...snap.data() } as UsuarioRol };
    } catch (e) {
      ultimo = e;
      if (i < INTENTOS - 1) await esperar();
    }
  }
  const codigo = (ultimo as { code?: string })?.code || "desconocido";
  console.error("Error consultando rol de usuario:", codigo, ultimo);
  return {
    estado: "error",
    mensaje:
      "No se pudo verificar tu cuenta (problema de conexión o permisos). Revisa tu conexión y vuelve a intentar.",
    codigo,
  };
}

export function consultarRol(uid: string): Promise<ResultadoRol> {
  return consultarRolEn(RESTAURANT_ID, uid);
}

// Recorre la lista de restaurantes y busca la membresía del usuario en cada uno.
// (Una collection-group query quedaría mejor, pero las reglas actuales no la permiten;
// con pocos restaurantes el costo de lecturas es mínimo.)
export async function consultarMembresias(
  uid: string
): Promise<Membresia[] | null> {
  let ultimo: unknown = null;
  for (let i = 0; i < INTENTOS; i++) {
    try {
      const regs = await getDocs(collection(db, "restaurantes"));
      const hits: Membresia[] = [];
      for (const r of regs.docs) {
        const m = await getDoc(doc(db, "restaurantes", r.id, "usuarios", uid));
        if (m.exists()) hits.push({ ...m.data(), uid, rid: r.id } as Membresia);
      }
      return hits;
    } catch (e) {
      ultimo = e;
      if (i < INTENTOS - 1) await esperar();
    }
  }
  const codigo = (ultimo as { code?: string })?.code || "desconocido";
  console.error("Error consultando membresías:", codigo, ultimo);
  return null;
}

export async function obtenerUsuarioRol(uid: string): Promise<UsuarioRol | null> {
  const r = await consultarRol(uid);
  return r.estado === "ok" ? r.usuario : null;
}

export async function esRol(uid: string, rol: RolUsuario): Promise<boolean> {
  const u = await obtenerUsuarioRol(uid);
  return u?.rol === rol && u.activo !== false;
}
