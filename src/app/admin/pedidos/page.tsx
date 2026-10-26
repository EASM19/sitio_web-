"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, increment,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Pedido, EstadoPedido, Mensaje } from "@/types";
import { sonarAlerta, desbloquearAudio } from "@/lib/sound";
import { pedirPermisoNotificaciones, notificar } from "@/lib/notif";
import { suscribirsePush, obtenerSuscripciones, enviarNotificacionPush } from "@/lib/push";
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
  const msgsPrevios = useRef<Map<string, string>>(new Map());
  const pendienteChatId = useRef<string | null>(null);
  const [avisos, setAvisos] = useState<
    { id: string; titulo: string; cuerpo: string; hora: Date; leido: boolean }[]
  >([]);
  const [bellAbierto, setBellAbierto] = useState(false);
  const [alertasActivas, setAlertasActivas] = useState(false);
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
    const params = new URLSearchParams(window.location.search);
    const chat = params.get("chat");
    if (chat) pendienteChatId.current = chat;
  }, []);

  const agregarAviso = (titulo: string, cuerpo: string) => {
    setAvisos((prev) =>
      [{ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, titulo, cuerpo, hora: new Date(), leido: false }, ...prev].slice(0, 50)
    );
  };

  const activarAlertas = async () => {
    const permiso = await pedirPermisoNotificaciones();
    desbloquearAudio();
    if (user) await suscribirsePush("admin", user.uid);
    setAlertasActivas(permiso === "granted");
  };

  useEffect(() => {
    if (!user) return;

    pedirPermisoNotificaciones().then((p) => setAlertasActivas(p === "granted"));
    suscribirsePush("admin", user.uid);

    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
      orderBy("fechaCreacion", "asc")
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
        pedidosData.forEach((p) => {
          if (p.ultimoMensaje) {
            msgsPrevios.current.set(p.id, p.ultimoMensaje.id);
          }
        });
      } else {
        for (const p of pedidosData) {
          if (!idsConocidos.current.has(p.id)) {
            sonarAlerta();
            const resumen = `${p.detalles.map((d) => `${d.cantidad}x ${d.nombre}`).join(", ")} — $${p.total.toFixed(2)}`;
            notificar(`🔔 Nuevo pedido #${p.numeroPedido}`, resumen, "/admin/pedidos");
            agregarAviso(`Nuevo pedido #${p.numeroPedido}`, resumen);
            obtenerSuscripciones({ tipo: "admin" }).then((subs) =>
              enviarNotificacionPush(`Nuevo pedido #${p.numeroPedido}`, resumen, "/admin/pedidos", subs)
            );
            idsConocidos.current.add(p.id);
          }

          if (p.ultimoMensaje && p.ultimoMensaje.emisor === "cliente") {
            const previo = msgsPrevios.current.get(p.id);
            if (previo !== undefined && previo !== p.ultimoMensaje.id) {
              sonarAlerta();
              const texto = p.ultimoMensaje.texto.slice(0, 120);
              notificar(`💬 Mensaje del cliente (Pedido #${p.numeroPedido})`, texto, `/admin/pedidos?chat=${p.id}`);
              agregarAviso(`Chat · Pedido #${p.numeroPedido}`, texto);
            }
            msgsPrevios.current.set(p.id, p.ultimoMensaje.id);
          }
        }
      }

      if (pendienteChatId.current) {
        const obj = pedidosData.find((p) => p.id === pendienteChatId.current);
        if (obj) {
          pendienteChatId.current = null;
          setMensajes([]);
          setChatPedido(obj);
        }
      }

      setPedidos(pedidosData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!chatPedido) return;
    if ((chatPedido.chatNoLeidoAdmin || 0) > 0) {
      updateDoc(doc(db, "restaurantes", RESTAURANT_ID, "pedidos", chatPedido.id), {
        chatNoLeidoAdmin: 0,
      });
    }
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
      const texto = textoMsg.trim();
      const msgRef = await addDoc(
        collection(db, "restaurantes", RESTAURANT_ID, "pedidos", chatPedido.id, "mensajes"),
        {
          emisor: "admin",
          nombre: user?.displayName || user?.email || "Restaurante",
          texto,
          fechaCreacion: serverTimestamp(),
        }
      );
      await updateDoc(doc(db, "restaurantes", RESTAURANT_ID, "pedidos", chatPedido.id), {
        chatNoLeidoCliente: increment(1),
        ultimoMensaje: { id: msgRef.id, emisor: "admin", texto },
      });
      setTextoMsg("");
      if (chatPedido.uid) {
        const cuerpo = textoMsg.trim().slice(0, 120);
        obtenerSuscripciones({ uid: chatPedido.uid }).then((subs) =>
          enviarNotificacionPush(
            `💬 Mensaje del restaurante (Pedido #${chatPedido.numeroPedido})`,
            cuerpo,
            `/pedido?chat=${chatPedido.id}`,
            subs
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnviandoMsg(false);
    }
  };

  const cambiarEstado = async (pedido: Pedido, nuevoEstado: EstadoPedido) => {
    const pedidoRef = doc(db, "restaurantes", RESTAURANT_ID, "pedidos", pedido.id);
    await updateDoc(pedidoRef, { estado: nuevoEstado });
    if (pedido.uid) {
      const avisos: Record<EstadoPedido, string> = {
        RECIBIDO: "Tu pedido fue recibido 🧾",
        PREPARANDO: "Tu pedido ya está en preparación 👨‍🍳",
        LISTO: "Tu pedido está listo para recoger 🎉",
        ENTREGADO: "Tu pedido fue entregado. ¡Gracias! ✅",
      };
      obtenerSuscripciones({ uid: pedido.uid }).then((subs) =>
        enviarNotificacionPush(
          `Pedido #${pedido.numeroPedido}`,
          avisos[nuevoEstado],
          `/pedido?pedido=${pedido.id}`,
          subs
        )
      );
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-rose-600 font-bold text-lg">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={activarAlertas}
              className={`text-sm px-3 py-1.5 rounded-lg font-bold border ${
                alertasActivas
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
              }`}
              title="Activar notificaciones y sonido"
            >
              {alertasActivas ? "✅ Alertas activas" : "🔔 Activar alertas"}
            </button>
            <div className="relative">
              <button
                onClick={() => setBellAbierto((v) => !v)}
                className="relative text-xl px-2 py-1 rounded-lg hover:bg-gray-100"
                title="Notificaciones"
              >
                🔔
                {avisos.filter((a) => !a.leido).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {avisos.filter((a) => !a.leido).length}
                  </span>
                )}
              </button>
              {bellAbierto && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBellAbierto(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                      <b className="text-sm text-gray-800">Notificaciones</b>
                      <button
                        onClick={() => setAvisos((prev) => prev.map((a) => ({ ...a, leido: true })))}
                        className="text-xs text-rose-600 font-bold"
                      >
                        Marcar leídas
                      </button>
                    </div>
                    {avisos.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">
                        Sin notificaciones aún
                      </p>
                    ) : (
                      avisos.map((a) => (
                        <div
                          key={a.id}
                          className={`p-3 border-b border-gray-50 text-sm ${a.leido ? "opacity-60" : "bg-rose-50/50"}`}
                        >
                          <div className="flex justify-between gap-2">
                            <b className="text-gray-800">{a.titulo}</b>
                            <span className="text-gray-400 text-xs whitespace-nowrap">
                              {a.hora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-0.5">{a.cuerpo}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-rose-600 hover:text-rose-700 font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mx-auto"></div>
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
                    ) : estado === "ENTREGADO" ? (
                      (() => {
                        const porFecha = new Map<string, Pedido[]>();
                        pedidosEstado.forEach((p) => {
                          const clave = p.fechaCreacion.toLocaleDateString("es-MX", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          });
                          if (!porFecha.has(clave)) porFecha.set(clave, []);
                          porFecha.get(clave)!.push(p);
                        });
                        return Array.from(porFecha.entries()).map(([fecha, lista]) => (
                          <div key={fecha}>
                            <p className="text-xs font-bold text-gray-500 uppercase sticky top-0 bg-white/60 backdrop-blur py-1 rounded">
                              📅 {fecha} · {lista.length} pedido{lista.length !== 1 ? "s" : ""} · ${lista.reduce((s, p) => s + p.total, 0).toFixed(2)}
                            </p>
                            <div className="space-y-3 mt-2">
                              {lista.map((pedido) => (
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
                                    <span className="font-bold text-rose-600">${pedido.total.toFixed(2)}</span>
                                    <button
                                      onClick={() => {
                                        setMensajes([]);
                                        setChatPedido(pedido);
                                      }}
                                      className="relative bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-200"
                                    >
                                      💬 Chat
                                      {(pedido.chatNoLeidoAdmin || 0) > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow">
                                          {pedido.chatNoLeidoAdmin}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()
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
                            <span className="font-bold text-rose-600">
                              ${pedido.total.toFixed(2)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setMensajes([]);
                                  setChatPedido(pedido);
                                }}
                                className="relative bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-200"
                                title="Chat con el cliente"
                              >
                                💬 Chat
                                {(pedido.chatNoLeidoAdmin || 0) > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow">
                                    {pedido.chatNoLeidoAdmin}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  const idx = ESTADOS.indexOf(estado);
                                  if (idx < ESTADOS.length - 1) {
                                    cambiarEstado(pedido, ESTADOS[idx + 1]);
                                  }
                                }}
                                className="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-rose-700 transition shadow"
                              >
                                {ESTADOS[ESTADOS.indexOf(estado) + 1]}
                              </button>
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
                        ? "bg-rose-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p>{m.texto}</p>
                    <p className={`text-[10px] mt-1 ${m.emisor === "admin" ? "text-rose-100" : "text-gray-400"}`}>
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
                className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
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
