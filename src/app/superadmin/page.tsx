"use client";

import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, updateProfile, User,
} from "firebase/auth";
import {
  collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { consultarRol, usuarioRolRef } from "@/lib/roles";
import type { RolUsuario, UsuarioRol } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  const credsRef = useRef<{ email: string; password: string } | null>(null);
  const creandoRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setAutorizado(false);
        setVerificando(false);
        return;
      }
      if (creandoRef.current) return;
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      credsRef.current = { email: email.trim(), password };
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
    if (creando) return;
    setMsgExito("");
    setError("");
    if (nuevoPass.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreando(true);
    creandoRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(
        auth, nuevoEmail.trim(), nuevoPass
      );
      try {
        await updateProfile(cred.user, { displayName: nuevoNombre.trim() });
      } catch {
        // perfil opcional
      }
      await setDoc(usuarioRolRef(cred.user.uid), {
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim(),
        rol: nuevoRol,
        telefono: nuevoTel.trim(),
        activo: true,
        ...(nuevoRol !== "superadmin" ? { restaurantId: "restaurante1" } : {}),
        creado: serverTimestamp(),
      });
      creandoRef.current = false;
      await signOut(auth);
      if (credsRef.current) {
        await signInWithEmailAndPassword(
          auth, credsRef.current.email, credsRef.current.password
        );
      }
      setMsgExito(`Cuenta creada: ${nuevoEmail.trim()} (${ROL_LABELS[nuevoRol]})`);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoPass("");
      setNuevoTel("");
      setNuevoRol("repartidor");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setError("Ese correo ya está registrado");
      } else if (code === "auth/invalid-email") {
        setError("Correo inválido");
      } else {
        setError("No se pudo crear la cuenta. Intenta de nuevo.");
      }
      const actual = auth.currentUser;
      if (!actual && credsRef.current) {
        try {
          await signInWithEmailAndPassword(
            auth, credsRef.current.email, credsRef.current.password
          );
        } catch {
          setError("Sesión expirada. Vuelve a iniciar sesión.");
        }
      }
    } finally {
      creandoRef.current = false;
      setCreando(false);
    }
  };

  const alternarActivo = async (u: UsuarioRol) => {
    if (u.uid === user?.uid) return;
    await updateDoc(usuarioRolRef(u.uid), { activo: u.activo === false });
  };

  const handleLogout = async () => {
    credsRef.current = null;
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
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
