"use client";

import { useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, User,
} from "firebase/auth";
import {
  collection, onSnapshot, orderBy, query, updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { consultarRol, usuarioRolRef } from "@/lib/roles";
import type { RolUsuario, UsuarioRol } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import type { RegistroRestaurante } from "@/lib/restaurantes";
import {
  escucharRestaurantes,
  generarSlug,
  pedirAccionRestaurante,
} from "@/lib/restaurantes";

const ROL_LABELS: Record<RolUsuario, string> = {
  superadmin: "👑 Superadmin",
  dueno: "🏪 Dueño",
  repartidor: "🛵 Repartidor",
};

const ROL_BADGE: Record<RolUsuario, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  dueno: "bg-amber-100 text-amber-700",
  repartidor: "bg-blue-100 text-blue-700",
};

export default function SuperadminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioRol[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPass, setNuevoPass] = useState("");
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>("repartidor");
  const [nuevoTel, setNuevoTel] = useState("");
  const [creando, setCreando] = useState(false);
  const [msgExito, setMsgExito] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);

  const [pestana, setPestana] = useState<"restaurantes" | "usuarios">("restaurantes");
  const [restaurantes, setRestaurantes] = useState<RegistroRestaurante[]>([]);
  const [formRestAbierto, setFormRestAbierto] = useState(false);
  const [rNombre, setRNombre] = useState("");
  const [rSlug, setRSlug] = useState("");
  const [rSlugTocado, setRSlugTocado] = useState(false);
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rDuenoNombre, setRDuenoNombre] = useState("");
  const [msgRest, setMsgRest] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [accionCargando, setAccionCargando] = useState<string | null>(null);
  const [qrRest, setQrRest] = useState<RegistroRestaurante | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [borrarRest, setBorrarRest] = useState<RegistroRestaurante | null>(null);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [duenoRest, setDuenoRest] = useState<RegistroRestaurante | null>(null);
  const [dEmail, setDEmail] = useState("");
  const [dPass, setDPass] = useState("");
  const [dNombre, setDNombre] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setAutorizado(false);
        setVerificando(false);
        return;
      }
      const r = await consultarRol(u.uid);
      if (r.estado === "error") {
        console.error("Verificación de rol falló:", r.codigo);
        setUser(null);
        setAutorizado(false);
        setVerificando(false);
        setError(r.mensaje);
        return;
      }
      const rol = r.usuario;
      if (rol && rol.rol === "superadmin" && rol.activo !== false) {
        setUser(u);
        setAutorizado(true);
        setError("");
      } else {
        await signOut(auth);
        setUser(null);
        setAutorizado(false);
        setError(
          !rol
            ? "Esta cuenta no tiene rol asignado. Contacta al superadmin."
            : rol.activo === false
            ? "Esta cuenta está desactivada."
            : "Esta cuenta no es superadmin."
        );
      }
      setVerificando(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!autorizado) return;
    const q = query(
      collection(db, "restaurantes", "restaurante1", "usuarios"),
      orderBy("creado", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setUsuarios(
        snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UsuarioRol)
      );
    });
    return () => unsub();
  }, [autorizado]);

  useEffect(() => {
    if (!autorizado) return;
    return escucharRestaurantes(setRestaurantes);
  }, [autorizado]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
      const r = await consultarRol(cred.user.uid);
      if (r.estado === "error") {
        setError(r.mensaje);
        return;
      }
      const rol = r.usuario;
      if (!rol || rol.rol !== "superadmin" || rol.activo === false) {
        await signOut(auth);
        setError(
          !rol
            ? "Esta cuenta no tiene rol asignado. Contacta al superadmin."
            : rol.activo === false
            ? "Esta cuenta está desactivada."
            : "Esta cuenta no es superadmin."
        );
      }
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creando || !user) return;
    setMsgExito("");
    setError("");
    if (nuevoNombre.trim().length < 2) {
      setError("Escribe el nombre de la persona");
      return;
    }
    if (nuevoPass.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreando(true);
    const email = nuevoEmail.trim().toLowerCase();
    const r = await pedirAccionRestaurante(user, {
      accion: "crear-cuenta",
      nombre: nuevoNombre.trim(),
      email,
      telefono: nuevoTel.trim(),
      rol: nuevoRol,
      password: nuevoPass,
    });
    setCreando(false);
    if (!r.ok) {
      setError(r.data.error || "No se pudo crear la cuenta. Intenta de nuevo.");
      return;
    }
    setMsgExito(
      r.data.creado || r.data.reparado
        ? `Cuenta creada: ${email} (${ROL_LABELS[nuevoRol]})`
        : `El correo ${email} ya existía: se le asignó el rol ${ROL_LABELS[nuevoRol]} y entra con su contraseña actual.`
    );
    setNuevoNombre("");
    setNuevoEmail("");
    setNuevoPass("");
    setNuevoTel("");
    setNuevoRol("repartidor");
  };

  const alternarActivo = async (u: UsuarioRol) => {
    if (u.uid === user?.uid) return;
    await updateDoc(usuarioRolRef(u.uid), { activo: u.activo === false });
  };

  const eliminarCuenta = async (u: UsuarioRol) => {
    if (!user || eliminando) return;
    const confirmar = window.confirm(
      `¿Eliminar la cuenta de ${u.email}? Se borrará de Firebase y ya no podrá iniciar sesión.`
    );
    if (!confirmar) return;
    setEliminando(u.uid);
    setError("");
    setMsgExito("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/eliminar-usuario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: u.uid }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "No se pudo eliminar la cuenta.");
        return;
      }
      setMsgExito(`Cuenta eliminada: ${u.email}`);
    } catch {
      setError("Error de conexión al eliminar. Intenta de nuevo.");
    } finally {
      setEliminando(null);
    }
  };

  const ejecutarAccionRest = async (
    clave: string,
    body: Record<string, unknown>,
    exito: string
  ): Promise<boolean> => {
    if (!user || accionCargando) return false;
    setAccionCargando(clave);
    setMsgRest(null);
    const r = await pedirAccionRestaurante(user, body);
    setAccionCargando(null);
    if (!r.ok) {
      setMsgRest({
        tipo: "err",
        texto: r.data.error || "No se pudo completar la acción.",
      });
      return false;
    }
    setMsgRest({ tipo: "ok", texto: exito });
    return true;
  };

  const crearRestaurante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accionCargando) return;
    const nombre = rNombre.trim();
    const slug = rSlug.trim().toLowerCase();
    if (nombre.length < 3) {
      setMsgRest({ tipo: "err", texto: "El nombre debe tener al menos 3 caracteres" });
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setMsgRest({ tipo: "err", texto: "Slug inválido: letras, números y guiones" });
      return;
    }
    if (rEmail && rPass && rPass.length < 6) {
      setMsgRest({ tipo: "err", texto: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    const ok = await ejecutarAccionRest(
      "crear",
      {
        accion: "crear",
        nombre,
        slug,
        ...(rEmail ? { email: rEmail.trim().toLowerCase() } : {}),
        ...(rPass ? { password: rPass } : {}),
        ...(rDuenoNombre ? { duenoNombre: rDuenoNombre.trim() } : {}),
      },
      `Restaurante creado: ${nombre}`
    );
    if (ok) {
      setFormRestAbierto(false);
      setRNombre("");
      setRSlug("");
      setRSlugTocado(false);
      setREmail("");
      setRPass("");
      setRDuenoNombre("");
      // Muestra de inmediato el QR propio del restaurante recién creado.
      setQrRest({
        id: slug,
        nombre,
        slug,
        activo: true,
        duenoEmail: rEmail.trim().toLowerCase() || null,
      });
    }
  };

  const toggleRestaurante = async (r: RegistroRestaurante) => {
    if (accionCargando) return;
    if (r.activo !== false) {
      const ok = window.confirm(
        `¿Desactivar "${r.nombre}"? No se perderá su historial; podrás reactivarlo cuando quieras.`
      );
      if (!ok) return;
    }
    await ejecutarAccionRest(
      `toggle:${r.id}`,
      { accion: "toggle", rid: r.id },
      r.activo !== false
        ? `Restaurante desactivado: ${r.nombre}`
        : `Restaurante activado: ${r.nombre}`
    );
  };

  const eliminarRestaurante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !borrarRest || borrando) return;
    if (confirmSlug.trim().toLowerCase() !== (borrarRest.slug || borrarRest.id).toLowerCase()) {
      setMsgRest({ tipo: "err", texto: "El slug no coincide. No se borró nada." });
      return;
    }
    setBorrando(true);
    setMsgRest(null);
    const r = await pedirAccionRestaurante(user, {
      accion: "eliminar",
      rid: borrarRest.id,
    });
    setBorrando(false);
    if (!r.ok) {
      setMsgRest({
        tipo: "err",
        texto: r.data.error || "No se pudo eliminar el restaurante.",
      });
      return;
    }
    setMsgRest({
      tipo: "ok",
      texto: `Restaurante eliminado: ${borrarRest.nombre}${
        r.data.cuentasBorradas
          ? ` (${r.data.cuentasBorradas} cuenta(s) de acceso borrada(s))`
          : ""
      }`,
    });
    try {
      if (localStorage.getItem("restauranteActual") === borrarRest.id) {
        localStorage.removeItem("restauranteActual");
      }
    } catch {
      // almacenamiento no disponible
    }
    setBorrarRest(null);
    setConfirmSlug("");
  };

  const renombrarRestaurante = async (r: RegistroRestaurante) => {
    if (accionCargando) return;
    const nuevo = window.prompt("Nuevo nombre del restaurante", r.nombre);
    if (!nuevo) return;
    const limpio = nuevo.trim();
    if (limpio.length < 3 || limpio === r.nombre) return;
    await ejecutarAccionRest(
      `upd:${r.id}`,
      { accion: "actualizar", rid: r.id, nombre: limpio },
      `Nombre actualizado: ${limpio}`
    );
  };

  const asignarDueno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duenoRest || accionCargando) return;
    const email = dEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setMsgRest({ tipo: "err", texto: "Correo inválido" });
      return;
    }
    if (dPass && dPass.length < 6) {
      setMsgRest({ tipo: "err", texto: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    const ok = await ejecutarAccionRest(
      `dueno:${duenoRest.id}`,
      {
        accion: "asignar-dueno",
        rid: duenoRest.id,
        email,
        ...(dPass ? { password: dPass } : {}),
        ...(dNombre ? { nombre: dNombre.trim() } : {}),
      },
      `Dueño asignado: ${email}`
    );
    if (ok) {
      setDuenoRest(null);
      setDEmail("");
      setDPass("");
      setDNombre("");
    }
  };

  const descargarQR = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !qrRest) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-${qrRest.slug || qrRest.id}.png`;
    a.click();
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/superadmin");
  };

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6efdc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!autorizado || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2b1d12] via-[#4a341c] to-[#2b1d12] p-4">
        <div className="bg-[#fffdf6]/95 backdrop-blur p-8 rounded-2xl shadow-xl w-full max-w-sm border-2 border-[#a67c3d]">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-purple-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Superadmin</h1>
            <p className="text-xs text-gray-500 mt-1">Gestión de cuentas y repartidores</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500"
              style={{ color: "#1f2937" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500"
              style={{ color: "#1f2937" }}
            />
            {error && <p className="text-amber-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-800 text-white py-3 rounded-xl font-bold hover:bg-purple-900 transition disabled:opacity-50 shadow"
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">👑</span>
            <div>
              <p className="font-bold text-gray-800 leading-tight">Panel Superadmin</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/pedidos"
              className="text-gray-600 hover:text-gray-800 font-medium text-sm"
            >
              🏪 Panel administrativo
            </Link>
            <button
              onClick={handleLogout}
              className="text-purple-800 hover:text-purple-900 font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPestana("restaurantes")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
              pestana === "restaurantes"
                ? "bg-purple-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🍽️ Restaurantes ({restaurantes.length})
          </button>
          <button
            onClick={() => setPestana("usuarios")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
              pestana === "usuarios"
                ? "bg-purple-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            👤 Cuentas ({usuarios.length})
          </button>
        </div>

        {pestana === "restaurantes" && (
          <>
            {msgRest && (
              <p
                className={`text-sm font-bold ${
                  msgRest.tipo === "ok" ? "text-green-600" : "text-amber-600"
                }`}
              >
                {msgRest.tipo === "ok" ? "✅ " : "⚠️ "}
                {msgRest.texto}
              </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-800">Gestión de restaurantes</h2>
                  <p className="text-xs text-gray-500">
                    Alta, edición, activación, dueño y QR de cada restaurante
                  </p>
                </div>
                <button
                  onClick={() => setFormRestAbierto(!formRestAbierto)}
                  className="bg-purple-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-900 transition w-full sm:w-auto shrink-0"
                >
                  {formRestAbierto ? "Cancelar" : "+ Nuevo restaurante"}
                </button>
              </div>
              {formRestAbierto && (
                <form
                  onSubmit={crearRestaurante}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100"
                >
                  <input
                    type="text"
                    value={rNombre}
                    onChange={(e) => {
                      setRNombre(e.target.value);
                      if (!rSlugTocado) setRSlug(generarSlug(e.target.value));
                    }}
                    placeholder="Nombre del restaurante"
                    required
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <input
                    type="text"
                    value={rSlug}
                    onChange={(e) => {
                      setRSlugTocado(true);
                      setRSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    placeholder="slug-del-restaurante"
                    required
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 font-mono"
                    style={{ color: "#1f2937" }}
                  />
                  <input
                    type="text"
                    value={rDuenoNombre}
                    onChange={(e) => setRDuenoNombre(e.target.value)}
                    placeholder="Nombre del dueño (opcional)"
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <input
                    type="email"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    placeholder="Correo del dueño (opcional)"
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <input
                    type="password"
                    value={rPass}
                    onChange={(e) => setRPass(e.target.value)}
                    placeholder="Contraseña (si la cuenta es nueva)"
                    minLength={6}
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <button
                    type="submit"
                    disabled={accionCargando !== null}
                    className="bg-purple-800 text-white py-2.5 rounded-xl font-bold hover:bg-purple-900 transition disabled:opacity-50 text-sm"
                  >
                    {accionCargando === "crear" ? "Creando..." : "Crear restaurante"}
                  </button>
                  <p className="text-xs text-gray-400 sm:col-span-2">
                    El slug forma la URL del QR (…/pedido-casa?r=slug) y no se cambia después.
                  </p>
                </form>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Lista ({restaurantes.length})</h2>
                <span className="text-xs text-gray-400">
                  Desactivar conserva el historial
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {restaurantes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-6">
                    Sin restaurantes todavía
                  </p>
                ) : (
                  restaurantes.map((r) => (
                    <div
                      key={r.id}
                      className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-800 truncate">
                          {r.nombre}
                          <span
                            className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                              r.activo === false
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {r.activo === false ? "Inactivo" : "Activo"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          /{r.slug} · {r.duenoEmail || "sin dueño asignado"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/pedidos?r=${r.id}`}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-800 text-white hover:bg-purple-900"
                        >
                          🚀 Abrir panel
                        </Link>
                        <button
                          onClick={() => setQrRest(r)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          🔗 QR
                        </button>
                        <button
                          onClick={() => renombrarRestaurante(r)}
                          disabled={accionCargando !== null}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => {
                            setDuenoRest(r);
                            setDEmail("");
                            setDPass("");
                            setDNombre("");
                          }}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          👤 Dueño
                        </button>
                        <button
                          onClick={() => toggleRestaurante(r)}
                          disabled={accionCargando !== null}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 ${
                            r.activo === false
                              ? "border-green-200 text-green-700 hover:bg-green-50"
                              : "border-amber-200 text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          {accionCargando === `toggle:${r.id}`
                            ? "..."
                            : r.activo === false
                            ? "▶ Activar"
                            : "⏸ Desactivar"}
                        </button>
                        {r.activo === false && (
                          <button
                            onClick={() => {
                              setBorrarRest(r);
                              setConfirmSlug("");
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            🗑 Borrar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {duenoRest && (
              <div className="bg-white rounded-xl border-2 border-purple-300 p-5 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-1">
                  Asignar dueño de {duenoRest.nombre}
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Si el correo ya tiene cuenta se asigna directo; si no, se crea con la
                  contraseña que escribas. El dueño anterior queda desactivado.
                </p>
                <form onSubmit={asignarDueno} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    value={dEmail}
                    onChange={(e) => setDEmail(e.target.value)}
                    placeholder="Correo del nuevo dueño"
                    required
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <input
                    type="text"
                    value={dNombre}
                    onChange={(e) => setDNombre(e.target.value)}
                    placeholder="Nombre (opcional)"
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <input
                    type="password"
                    value={dPass}
                    onChange={(e) => setDPass(e.target.value)}
                    placeholder="Contraseña (si es cuenta nueva)"
                    minLength={6}
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
                    style={{ color: "#1f2937" }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={accionCargando !== null}
                      className="bg-purple-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-900 transition disabled:opacity-50"
                    >
                      {accionCargando === `dueno:${duenoRest.id}` ? "Asignando..." : "Asignar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuenoRest(null)}
                      className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {qrRest && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setQrRest(null)}
              >
                <div
                  className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm text-center shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-bold text-gray-800 mb-1">QR de {qrRest.nombre}</h3>
                  <p className="text-xs text-gray-500 mb-4 break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}
                    /pedido-casa?r={qrRest.slug || qrRest.id}
                  </p>
                  <div className="bg-gray-50 w-full max-w-[320px] mx-auto p-3 sm:p-4 rounded-2xl border border-gray-100 mb-4">
                    <QRCodeCanvas
                      ref={qrCanvasRef}
                      value={`${
                        typeof window !== "undefined" ? window.location.origin : ""
                      }/pedido-casa?r=${qrRest.slug || qrRest.id}`}
                      size={288}
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={descargarQR}
                      className="bg-purple-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-900"
                    >
                      ⬇️ Descargar PNG
                    </button>
                    <button
                      onClick={() => setQrRest(null)}
                      className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200"
                    >
                      Cerrar
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">
                    Cada restaurante tiene su propio QR (…?r={qrRest.slug || qrRest.id}).
                  </p>
                </div>
              </div>
            )}

            {borrarRest && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => {
                  if (!borrando) setBorrarRest(null);
                }}
              >
                <div
                  className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-bold text-red-700 text-lg mb-1">
                    🗑 Borrar {borrarRest.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Se borrará de forma permanente: el menú (categorías y productos),
                    pedidos y mensajes, opiniones, clientes, notificaciones y las cuentas
                    de este restaurante. El correo del dueño también se elimina si no se
                    usa en otro restaurante.
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Escribe{" "}
                    <span className="font-mono font-bold">
                      {borrarRest.slug || borrarRest.id}
                    </span>{" "}
                    para confirmar:
                  </p>
                  <form onSubmit={eliminarRestaurante} className="space-y-3">
                    <input
                      type="text"
                      value={confirmSlug}
                      onChange={(e) => setConfirmSlug(e.target.value)}
                      placeholder={borrarRest.slug || borrarRest.id}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 font-mono"
                      style={{ color: "#1f2937" }}
                    />
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        type="submit"
                        disabled={
                          borrando ||
                          confirmSlug.trim().toLowerCase() !==
                            (borrarRest.slug || borrarRest.id).toLowerCase()
                        }
                        className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {borrando ? "Borrando..." : "🗑 Borrar definitivamente"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBorrarRest(null)}
                        disabled={borrando}
                        className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {pestana === "usuarios" && (
          <>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1">Crear cuenta</h2>
          <p className="text-xs text-gray-500 mb-4">
            Cuentas de dueño, repartidor u otro superadmin. El usuario inicia sesión con su correo y contraseña.
          </p>
          <form onSubmit={crearUsuario} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre completo"
              required
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
              style={{ color: "#1f2937" }}
            />
            <input
              type="email"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              placeholder="Correo"
              required
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
              style={{ color: "#1f2937" }}
            />
            <input
              type="text"
              value={nuevoTel}
              onChange={(e) => setNuevoTel(e.target.value)}
              placeholder="Teléfono (opcional)"
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
              style={{ color: "#1f2937" }}
            />
            <input
              type="password"
              value={nuevoPass}
              onChange={(e) => setNuevoPass(e.target.value)}
              placeholder="Contraseña (mín. 6 caracteres)"
              required
              minLength={6}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400"
              style={{ color: "#1f2937" }}
            />
            <select
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white"
              style={{ color: "#1f2937" }}
            >
              <option value="repartidor">🛵 Repartidor</option>
              <option value="dueno">🏪 Dueño</option>
              <option value="superadmin">👑 Superadmin</option>
            </select>
            <button
              type="submit"
              disabled={creando}
              className="bg-purple-800 text-white py-2.5 rounded-xl font-bold hover:bg-purple-900 transition disabled:opacity-50 text-sm"
            >
              {creando ? "Creando..." : "Crear cuenta"}
            </button>
          </form>
          {msgExito && (
            <p className="text-green-600 text-sm font-bold mt-3">✅ {msgExito}</p>
          )}
          {error && <p className="text-amber-600 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Cuentas ({usuarios.length})</h2>
            <span className="text-xs text-gray-400">
              Desactiva una cuenta para bloquear su acceso
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {usuarios.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">
                Sin cuentas todavía
              </p>
            ) : (
              usuarios.map((u) => (
                <div key={u.uid} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-800 truncate">
                      {u.nombre || "Sin nombre"}
                      {u.uid === user.uid && (
                        <span className="text-gray-400 font-normal"> (tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${ROL_BADGE[u.rol] || "bg-gray-100 text-gray-600"}`}>
                    {ROL_LABELS[u.rol] || u.rol}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      u.activo === false ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {u.activo === false ? "Inactiva" : "Activa"}
                  </span>
                  {u.uid !== user.uid && (
                    <button
                      onClick={() => alternarActivo(u)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      {u.activo === false ? "Activar" : "Desactivar"}
                    </button>
                  )}
                  {u.uid !== user.uid && u.rol !== "superadmin" && (
                    <button
                      onClick={() => eliminarCuenta(u)}
                      disabled={eliminando !== null}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {eliminando === u.uid ? "Eliminando..." : "🗑 Eliminar"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
