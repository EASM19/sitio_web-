"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Pedido, EstadoPedido, Mensaje } from "@/types";
import { sonarAlerta } from "@/lib/sound";
import { pedirPermisoNotificaciones, notificar } from "@/lib/notif";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ESTADOS: EstadoPedido[] = ["RECIBIDO", "PREPARANDO", "LISTO", "ENTREGADO"];

const ESTADO_COLORS: Record<EstadoPedido, string> = {
  RECIBIDO: "bg-blue-50 border-blue-200",
  PREPARANDO: "bg-yellow-50 border-yellow-200",
  LISTO: "bg-green-50 border-green-200",
  ENTREGADO: "bg-gray-50 border-gray-200",
};

const ESTADO_TEXT_COLORS: Record<EstadoPedido, string> = {
  RECIBIDO: "text-blue-700",
  PREPARANDO: "text-yellow-700",
  LISTO: "text-green-700",
  ENTREGADO: "text-gray-700",
};

const ESTADO_BG: Record<EstadoPedido, string> = {
  RECIBIDO: "bg-blue-500",
  PREPARANDO: "bg-yellow-500",
  LISTO: "bg-green-500",
  ENTREGADO: "bg-gray-500",
};

export default function PedidosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatPedido, setChatPedido] = useState<Pedido | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [textoMsg, setTextoMsg] = useState("");
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const idsConocidos = useRef<Set<string> | null>(null);
  const router = useRouter();

  const RESTAURANT_ID = "restaurante1";

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/admin/login");
      } else {
        setUser(u);
      }
    });

    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    pedirPermisoNotificaciones();

    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
      orderBy("fechaCreacion", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
      })) as Pedido[];

      const ids = new Set(pedidosData.map((p) => p.id));
      if (idsConocidos.current === null) {
        idsConocidos.current = ids;
      } else {
        for (const p of pedidosData) {
          if (!idsConocidos.current.has(p.id)) {
            sonarAlerta();
            notificar(
              `🔔 Nuevo pedido #${p.numeroPedido}`,
              `${p.detalles.map((d) => `${d.cantidad}x ${d.nombre}`).join(", ")} — $${p.total.toFixed(2)}`
            );
            idsConocidos.current.add(p.id);
          }
        }
      }

      setPedidos(pedidosData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!chatPedido) return;
    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos", chatPedido.id, "mensajes"),
      orderBy("fechaCreacion", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMensajes(
        snap.docs.map((m) => ({
          id: m.id,
          ...m.data(),
          fechaCreacion: m.data().fechaCreacion?.toDate() || null,
        })) as Mensaje[]
      );
    });
    return () => unsub();
  }, [chatPedido]);

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoMsg.trim() || !chatPedido || enviandoMsg) return;
    setEnviandoMsg(true);
    try {
      await addDoc(
        collection(db, "restaurantes", RESTAURANT_ID, "pedidos", chatPedido.id, "mensajes"),
        {
          emisor: "admin",
          nombre: user?.displayName || user?.email || "Restaurante",
          texto: textoMsg.trim(),
          fechaCreacion: serverTimestamp(),
        }
      );
      setTextoMsg("");
    } catch (err) {
      console.error(err);
    } finally {
      setEnviandoMsg(false);
    }
  };

  const cambiarEstado = async (pedido: Pedido, nuevoEstado: EstadoPedido) => {
    const pedidoRef = doc(db, "restaurantes", RESTAURANT_ID, "pedidos", pedido.id);
    await updateDoc(pedidoRef, { estado: nuevoEstado });
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-red-600 font-bold text-lg">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ESTADOS.map((estado) => {
              const pedidosEstado = pedidos.filter((p) => p.estado === estado);
              return (
                <div key={estado} className={`rounded-xl p-4 border ${ESTADO_COLORS[estado]}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${ESTADO_BG[estado]}`}></div>
                    <h2 className={`font-bold ${ESTADO_TEXT_COLORS[estado]}`}>
                      {estado}
                    </h2>
                    <span className="ml-auto bg-white/80 px-2 py-0.5 rounded-full text-sm font-bold">
                      {pedidosEstado.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pedidosEstado.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-4">Sin pedidos</p>
                    ) : (
                      pedidosEstado.map((pedido) => (
                        <div key={pedido.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-lg text-gray-800">#{pedido.numeroPedido}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {pedido.tipo === "MESA" ? `Mesa ${pedido.mesaNumero}` : pedido.tipo === "PARA_LLEVAR" ? "🛍️ Recoger" : "🏠 Domicilio"}
                            </span>
                          </div>
                          {pedido.infoCliente && (
                            <p className="text-xs text-gray-500 mb-2">
                              {pedido.infoCliente.nombre} · {pedido.infoCliente.telefono}
                              {pedido.infoCliente.direccion && ` · ${pedido.infoCliente.direccion}`}
                              {pedido.infoCliente.hora && ` · ${pedido.infoCliente.hora}`}
                            </p>
                          )}
                          <div className="text-sm space-y-1 mb-3">
                            {pedido.detalles.map((detalle, idx) => (
                              <div key={idx} className="flex justify-between text-gray-600">
                                <span>{detalle.cantidad}x {detalle.nombre}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="font-bold text-red-600">
                              ${pedido.total.toFixed(2)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setMensajes([]);
                                  setChatPedido(pedido);
                                }}
                                className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-200"
                                title="Chat con el cliente"
                              >
                                💬 Chat
                              </button>
                              {estado !== "ENTREGADO" && (
                                <button
                                  onClick={() => {
                                    const idx = ESTADOS.indexOf(estado);
                                    if (idx < ESTADOS.length - 1) {
                                      cambiarEstado(pedido, ESTADOS[idx + 1]);
                                    }
                                  }}
                                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:from-red-600 hover:to-orange-600 transition shadow"
                                >
                                  {ESTADOS[ESTADOS.indexOf(estado) + 1]}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {chatPedido && (
        <div
          className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center p-4"
          onClick={() => setChatPedido(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-800">
                  💬 Chat · Pedido #{chatPedido.numeroPedido}
                </h3>
                <p className="text-xs text-gray-500">
                  {chatPedido.infoCliente?.nombre || chatPedido.clienteEmail || "Cliente"}
                </p>
              </div>
              <button
                onClick={() => setChatPedido(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensajes.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  Aún no hay mensajes. Escríbele al cliente si necesitas información.
                </p>
              )}
              {mensajes.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.emisor === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      m.emisor === "admin"
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p>{m.texto}</p>
                    <p className={`text-[10px] mt-1 ${m.emisor === "admin" ? "text-red-100" : "text-gray-400"}`}>
                      {m.nombre}
                      {m.fechaCreacion &&
                        ` · ${m.fechaCreacion.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={enviarMensaje} className="p-3 border-t flex gap-2">
              <input
                type="text"
                value={textoMsg}
                onChange={(e) => setTextoMsg(e.target.value)}
                placeholder="Responder al cliente..."
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none"
                style={{ color: "#1f2937" }}
              />
              <button
                type="submit"
                disabled={enviandoMsg || !textoMsg.trim()}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
