"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection, query, where, getDocs, orderBy, onSnapshot, doc, addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import type { Pedido, Mensaje } from "@/types";
import { sonarAlerta } from "@/lib/sound";
import { pedirPermisoNotificaciones, notificar } from "@/lib/notif";

const RESTAURANT_ID = "restaurante1";

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "RECIBIDO": return "bg-blue-100 text-blue-800";
    case "PREPARANDO": return "bg-yellow-100 text-yellow-800";
    case "LISTO": return "bg-green-100 text-green-800";
    case "ENTREGADO": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const progreso = (estado: string) =>
  estado === "RECIBIDO" ? "25%" :
  estado === "PREPARANDO" ? "50%" :
  estado === "LISTO" ? "75%" : "100%";

export default function PedidoPage() {
  const [numeroPedido, setNumeroPedido] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [misPedidos, setMisPedidos] = useState<Pedido[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [pedidoSel, setPedidoSel] = useState<Pedido | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [textoMsg, setTextoMsg] = useState("");
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const estadosPrevios = useRef<Map<string, string>>(new Map());
  const primerSnapshot = useRef(true);
  const pedidoSelIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) pedirPermisoNotificaciones();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    primerSnapshot.current = true;
    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
      where("uid", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
        })) as Pedido[];
      lista.sort((a, b) => b.numeroPedido - a.numeroPedido);

      if (primerSnapshot.current) {
        primerSnapshot.current = false;
        lista.forEach((p) => estadosPrevios.current.set(p.id, p.estado));
        if (lista.length > 0 && !seleccionadoId) {
          const activo = lista.find((p) => p.estado !== "ENTREGADO") || lista[0];
          setSeleccionadoId(activo.id);
        }
      } else {
        lista.forEach((p) => {
          const prev = estadosPrevios.current.get(p.id);
          if (prev && prev !== "LISTO" && p.estado === "LISTO") {
            sonarAlerta();
            notificar(
              `✅ Tu pedido #${p.numeroPedido} está listo`,
              "Puedes pasar a recogerlo. Toca para ver los detalles."
            );
          }
          estadosPrevios.current.set(p.id, p.estado);
        });
        if (!seleccionadoId && lista.length > 0) {
          setSeleccionadoId(lista[0].id);
        }
      }
      setMisPedidos(lista);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    pedidoSelIdRef.current = seleccionadoId;
    if (!seleccionadoId) return;

    const pedidoUnsub = onSnapshot(
      doc(db, "restaurantes", RESTAURANT_ID, "pedidos", seleccionadoId),
      (d) => {
        if (d.exists()) {
          setPedidoSel({
            id: d.id,
            ...d.data(),
            fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
          } as Pedido);
        }
      }
    );

    const msgsUnsub = onSnapshot(
      query(
        collection(db, "restaurantes", RESTAURANT_ID, "pedidos", seleccionadoId, "mensajes"),
        orderBy("fechaCreacion", "asc")
      ),
      (snap) => {
        setMensajes(
          snap.docs.map((m) => ({
            id: m.id,
            ...m.data(),
            fechaCreacion: m.data().fechaCreacion?.toDate() || null,
          })) as Mensaje[]
        );
      }
    );

    return () => {
      pedidoUnsub();
      msgsUnsub();
    };
  }, [seleccionadoId]);

  const buscarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroPedido.trim()) return;

    setBuscando(true);
    setNoEncontrado(false);

    try {
      const q = query(
        collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
        where("numeroPedido", "==", parseInt(numeroPedido))
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setNoEncontrado(true);
        setSeleccionadoId(null);
        setPedidoSel(null);
        setMensajes([]);
      } else {
        setNoEncontrado(false);
        setMensajes([]);
        setSeleccionadoId(snap.docs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuscando(false);
    }
  };

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoMsg.trim() || !seleccionadoId || enviandoMsg) return;
    setEnviandoMsg(true);
    try {
      await addDoc(
        collection(db, "restaurantes", RESTAURANT_ID, "pedidos", seleccionadoId, "mensajes"),
        {
          emisor: "cliente",
          nombre: user?.displayName || user?.email || "Cliente",
          uid: user?.uid || "",
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

  const entrarConGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      pedirPermisoNotificaciones();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto pt-8 pb-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mis Pedidos</h1>
          <p className="text-gray-500 text-sm">
            {user
              ? "Estado en tiempo real de tus pedidos"
              : "Consulta un pedido o inicia sesión para ver tu historial"}
          </p>
        </div>

        {!user ? (
          <div className="space-y-4">
            <button
              onClick={entrarConGoogle}
              className="w-full border-2 border-gray-200 bg-white text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 shadow-sm flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Ver mis pedidos con Google
            </button>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-gray-800 mb-3 text-sm">O busca un pedido por número</p>
              <form onSubmit={buscarPedido} className="flex gap-3">
                <input
                  type="number"
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value)}
                  placeholder="Ej: 1025"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                  style={{ color: "#1f2937" }}
                />
                <button
                  type="submit"
                  disabled={buscando}
                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 shadow"
                >
                  {buscando ? "..." : "Buscar"}
                </button>
              </form>
            </div>

            {noEncontrado && (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <p className="text-red-500">Pedido no encontrado</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {misPedidos.length} pedido{misPedidos.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={async () => {
                  await signOut(auth);
                  setMisPedidos([]);
                  setSeleccionadoId(null);
                  setPedidoSel(null);
                  setMensajes([]);
                }}
                className="text-red-600 text-sm font-medium"
              >
                Cerrar sesión
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {misPedidos.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">
                  Aún no has hecho pedidos con esta cuenta
                </p>
              ) : (
                misPedidos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSeleccionadoId(p.id)}
                    className={`w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 ${
                      seleccionadoId === p.id ? "bg-red-50" : ""
                    }`}
                  >
                    <div>
                      <span className="font-bold text-gray-800">#{p.numeroPedido}</span>
                      <p className="text-xs text-gray-500">
                        {p.fechaCreacion instanceof Date
                          ? p.fechaCreacion.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                          : ""}
                        {" · "}${p.total.toFixed(2)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getEstadoColor(p.estado)}`}>
                      {p.estado}
                    </span>
                  </button>
                ))
              )}
            </div>

            {seleccionadoId && (
              <form onSubmit={buscarPedido} className="flex gap-3">
                <input
                  type="number"
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value)}
                  placeholder="Buscar otro por número"
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl outline-none text-sm"
                  style={{ color: "#1f2937" }}
                />
                <button
                  type="submit"
                  disabled={buscando}
                  className="bg-white border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold"
                >
                  Buscar
                </button>
              </form>
            )}
          </div>
        )}

        {pedidoSel && (
          <div className="mt-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Pedido #{pedidoSel.numeroPedido}</h2>
                <p className="text-sm text-gray-500">
                  {pedidoSel.tipo === "MESA"
                    ? `Mesa ${pedidoSel.mesaNumero}`
                    : pedidoSel.tipo === "PARA_LLEVAR"
                    ? "🛍️ Para llevar"
                    : "🏠 Domicilio"}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getEstadoColor(pedidoSel.estado)}`}>
                {pedidoSel.estado}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {pedidoSel.detalles.map((detalle, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{detalle.cantidad}x {detalle.nombre}</span>
                  <span className="text-gray-800 font-medium">${(detalle.precio * detalle.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-800">Total</span>
              <span className="font-bold text-red-600 text-lg">${pedidoSel.total.toFixed(2)}</span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Recibido</span>
                <span>Preparando</span>
                <span>Listo</span>
                <span>Entregado</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                  style={{ width: progreso(pedidoSel.estado) }}
                ></div>
              </div>
              {pedidoSel.estado === "LISTO" && (
                <p className="text-green-600 font-bold text-sm mt-2 text-center">
                  🎉 Tu pedido está listo para recoger
                </p>
              )}
            </div>
          </div>
        )}

        {pedidoSel && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-3">💬 Chat con el restaurante</h3>
            {!user ? (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">
                  Inicia sesión para chatear con el restaurante
                </p>
                <button
                  onClick={entrarConGoogle}
                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold"
                >
                  Iniciar sesión con Google
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                  {mensajes.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-2">
                      Envía un mensaje si tienes alguna duda o información
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
                <form onSubmit={enviarMensaje} className="flex gap-2">
                  <input
                    type="text"
                    value={textoMsg}
                    onChange={(e) => setTextoMsg(e.target.value)}
                    placeholder="Escribe un mensaje..."
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
