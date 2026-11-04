"use client";

import { useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { sonarAlerta } from "@/lib/sound";
import { notificar } from "@/lib/notif";
import { suscribirsePush } from "@/lib/push";

const RESTAURANT_ID = "restaurante1";

export function useAvisosPedido(user: User | null) {
  const idsConocidos = useRef<Set<string> | null>(null);
  const msgsPrevios = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    suscribirsePush("admin", user.uid);
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
      orderBy("fechaCreacion", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      const ids = new Set(docs.map((d) => d.id));
      if (idsConocidos.current === null) {
        idsConocidos.current = ids;
        docs.forEach((d) => {
          const p = d.data();
          if (p.ultimoMensaje) msgsPrevios.current.set(d.id, p.ultimoMensaje.id);
        });
        return;
      }
      for (const d of docs) {
        const p = d.data();
        if (!idsConocidos.current.has(d.id)) {
          const resumen = `${(p.detalles || [])
            .map((x: { cantidad: number; nombre: string }) => `${x.cantidad}x ${x.nombre}`)
            .join(", ")} — $${(p.total || 0).toFixed(2)}`;
          sonarAlerta();
          notificar(`🔔 Nuevo pedido #${p.numeroPedido}`, resumen, "/admin/pedidos");
          idsConocidos.current.add(d.id);
        }
        if (p.ultimoMensaje && p.ultimoMensaje.emisor === "cliente") {
          const previo = msgsPrevios.current.get(d.id);
          if (previo !== undefined && previo !== p.ultimoMensaje.id) {
            sonarAlerta();
            notificar(
              `💬 Mensaje del cliente (Pedido #${p.numeroPedido})`,
              String(p.ultimoMensaje.texto || "").slice(0, 120),
              `/admin/pedidos?chat=${d.id}`
            );
          }
          msgsPrevios.current.set(d.id, p.ultimoMensaje.id);
        }
      }
    });
    return () => unsub();
  }, []);
}
