"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { consultarMembresias } from "@/lib/roles";
import {
  aceptarPedido, cambiarEstadoRepartidor, escucharDomiciliosListos, escucharMisEntregas,
} from "@/lib/repartidor";
import { suscribirsePush } from "@/lib/push";
import { pedirPermisoNotificaciones } from "@/lib/notif";
import { useSesionActiva } from "@/hooks/useSesionActiva";
import type { EstadoPedido, Pedido } from "@/types";
import { useRouter } from "next/navigation";

const COLOR_ESTADO: Record<string, string> = {
  RECIBIDO: "bg-blue-100 text-blue-700",
  PREPARANDO: "bg-yellow-100 text-yellow-700",
  LISTO: "bg-green-100 text-green-700",
  EN_CAMINO: "bg-purple-100 text-purple-700",
  ENTREGADO: "bg-gray-100 text-gray-600",
};

export default function RepartidorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [ridPropio, setRidPropio] = useState<string | null>(null);
  const [nombreRest, setNombreRest] = useState("");
  const [disponibles, setDisponibles] = useState<Pedido[]>([]);
  const [mias, setMias] = useState<Pedido[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [accionando, setAccionando] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  useSesionActiva(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setAutorizado(false);
        setRidPropio(null);
        setVerificando(false);
        return;
      }
      const membresias = await consultarMembresias(u.uid);
      const rep = membresias?.find(
        (m) => m.rol === "repartidor" && m.activo !== false
      );
      if (rep) {
        setUser(u);
        setRidPropio(rep.rid);
        setAutorizado(true);
      } else {
        setUser(null);
        setAutorizado(false);
        setRidPropio(null);
        setNombreRest("");
        setError(
          membresias === null
            ? "No se pudo verificar tu cuenta. Intenta de nuevo."
            : "Esta cuenta no es de repartidor o está desactivada"
        );
      }
      setVerificando(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!autorizado || !user || !ridPropio) return;
    pedirPermisoNotificaciones();
    suscribirsePush("repartidor", user.uid, ridPropio);

    const unsubDisp = escucharDomiciliosListos((lista) => {
      lista.sort((a, b) => a.fechaCreacion.getTime() - b.fechaCreacion.getTime());
      setDisponibles(lista);
    }, ridPropio);
    const unsubMias = escucharMisEntregas(user.uid, (lista) => {
      lista.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
      setMias(lista);
    }, ridPropio);
    return () => {
      unsubDisp();
      unsubMias();
    };
  }, [autorizado, user, ridPropio]);

  useEffect(() => {
    if (!ridPropio) return;
    let vigente = true;
    getDoc(doc(db, "restaurantes", ridPropio))
      .then((s) => {
        if (vigente) {
          setNombreRest(
            s.exists() ? String(s.data().nombre || ridPropio) : ridPropio
          );
        }
      })
      .catch(() => {
        if (vigente) setNombreRest(ridPropio);
      });
    return () => {
      vigente = false;
    };
  }, [ridPropio]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const membresias = await consultarMembresias(cred.user.uid);
      const rep = membresias?.find((m) => m.rol === "repartidor");
      if (!rep) {
        setError(
          membresias === null
            ? "No se pudo verificar tu cuenta. Intenta de nuevo."
            : "Esta cuenta no es de repartidor. Usa el panel de administración."
        );
        return;
      }
      if (rep.activo === false) {
        setError("Esta cuenta está desactivada");
        return;
      }
      setPassword("");
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/repartidor");
  };

  const limpiarError = (id: string) =>
    setErrores((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const aceptar = async (p: Pedido) => {
    if (!user || !ridPropio || accionando) return;
    limpiarError(p.id);
    setAccionando(p.id);
    const nombre = user.displayName || user.email || "Repartidor";
    const res = await aceptarPedido(p.id, user.uid, nombre, ridPropio);
    if (!res.ok && res.error) setErrores((prev) => ({ ...prev, [p.id]: res.error! }));
    setAccionando(null);
  };

  const avanzar = async (p: Pedido) => {
    if (!user || !ridPropio || accionando) return;
    limpiarError(p.id);
    const destino: EstadoPedido | null =
      p.estado === "LISTO" ? "EN_CAMINO" : p.estado === "EN_CAMINO" ? "ENTREGADO" : null;
    if (!destino) return;
    setAccionando(p.id);
    const res = await cambiarEstadoRepartidor(p.id, user.uid, destino, ridPropio);
    if (!res.ok && res.error) setErrores((prev) => ({ ...prev, [p.id]: res.error! }));
    setAccionando(null);
  };

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6efdc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!autorizado || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#12213a] via-[#1d3355] to-[#12213a] p-4">
        <div className="bg-[#fffdf6]/95 backdrop-blur p-8 rounded-2xl shadow-xl w-full max-w-sm border-2 border-[#4a6fa5]">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-3xl">🛵</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Acceso Repartidores</h1>
            <p className="text-xs text-gray-500 mt-1">Domicilios de tu restaurante</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500"
              style={{ color: "#1f2937" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500"
              style={{ color: "#1f2937" }}
            />
            {error && <p className="text-amber-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition disabled:opacity-50 shadow"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6efdc]">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛵</span>
            <div>
              <p className="font-bold text-gray-800 leading-tight">Mis Domicilios</p>
              <p className="text-xs font-bold text-blue-800">
                🏪 {nombreRest || ridPropio}
              </p>
              <p className="text-xs text-gray-500">
                {user.displayName || user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-blue-800 hover:text-blue-900 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <section>
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            📦 Pedidos disponibles
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {disponibles.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Domicilios listos en el restaurante. El primero en aceptar se lo lleva.
          </p>
          <div className="space-y-3">
            {disponibles.length === 0 ? (
              <p className="text-sm text-gray-400 italic bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center">
                Sin domicilios disponibles por ahora
              </p>
            ) : (
              disponibles.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-gray-800">#{p.numeroPedido}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      🏠 Domicilio
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-800 mb-1">
                    🏪 {nombreRest || ridPropio}
                  </p>
                  {p.infoCliente && (
                    <p className="text-sm text-gray-600">
                      {p.infoCliente.nombre || "Cliente"} · {p.infoCliente.telefono}
                    </p>
                  )}
                  {p.infoCliente?.direccion && (
                    <p className="text-sm text-gray-700 mt-1">📍 {p.infoCliente.direccion}</p>
                  )}
                  {p.infoCliente?.referencia && (
                    <p className="text-xs font-bold text-gray-600 mt-0.5">
                      📌 {p.infoCliente.referencia}
                    </p>
                  )}
                  <div className="text-sm space-y-1 my-2">
                    {p.detalles.map((d, idx) => (
                      <div key={idx} className="flex justify-between text-gray-600">
                        <span>{d.cantidad}x {d.nombre}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-bold text-amber-800">${p.total.toFixed(2)}</span>
                    <button
                      onClick={() => aceptar(p)}
                      disabled={accionando !== null}
                      className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-900 transition disabled:opacity-50"
                    >
                      {accionando === p.id ? "Aceptando..." : "Aceptar pedido"}
                    </button>
                  </div>
                  {errores[p.id] && (
                    <p className="text-red-600 text-xs font-bold mt-2">{errores[p.id]}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            🚚 Mis entregas
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {mias.filter((p) => p.estado !== "ENTREGADO").length}
            </span>
          </h2>
          <div className="space-y-3">
            {mias.length === 0 ? (
              <p className="text-sm text-gray-400 italic bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center">
                Aún no tienes entregas asignadas
              </p>
            ) : (
              mias.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-gray-800">#{p.numeroPedido}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLOR_ESTADO[p.estado] || "bg-gray-100 text-gray-600"}`}>
                      {p.estado === "EN_CAMINO" ? "EN CAMINO" : p.estado}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-800 mb-1">
                    🏪 {nombreRest || ridPropio}
                  </p>
                  {p.infoCliente && (
                    <p className="text-sm text-gray-600">
                      {p.infoCliente.nombre || "Cliente"} · {p.infoCliente.telefono}
                    </p>
                  )}
                  {p.infoCliente?.direccion && (
                    <p className="text-sm text-gray-700 mt-1">📍 {p.infoCliente.direccion}</p>
                  )}
                  {p.infoCliente?.referencia && (
                    <p className="text-xs font-bold text-gray-600 mt-0.5">
                      📌 {p.infoCliente.referencia}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {p.detalles.map((d) => `${d.cantidad}x ${d.nombre}`).join(", ")} ·{" "}
                    <span className="font-bold text-amber-800">${p.total.toFixed(2)}</span>
                  </p>
                  <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {p.fechaCreacion.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {(p.estado === "LISTO" || p.estado === "EN_CAMINO") && (
                      <button
                        onClick={() => avanzar(p)}
                        disabled={accionando !== null}
                        className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition disabled:opacity-50 ${
                          p.estado === "LISTO"
                            ? "bg-purple-700 hover:bg-purple-800"
                            : "bg-green-700 hover:bg-green-800"
                        }`}
                      >
                        {accionando === p.id
                          ? "Actualizando..."
                          : p.estado === "LISTO"
                          ? "🛵 Salir a entregar"
                          : "✅ Marcar entregado"}
                      </button>
                    )}
                  </div>
                  {errores[p.id] && (
                    <p className="text-red-600 text-xs font-bold mt-2">{errores[p.id]}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
