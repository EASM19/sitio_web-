"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { pedirPermisoNotificaciones } from "@/lib/notif";
import { desbloquearAudio } from "@/lib/sound";
import { suscribirsePush } from "@/lib/push";
import { obtenerUsuarioRol } from "@/lib/roles";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const rol = await obtenerUsuarioRol(cred.user.uid);
      if (rol && rol.activo === false) {
        await signOut(auth);
        setError("Esta cuenta está desactivada");
        return;
      }
      desbloquearAudio();
      if (rol?.rol === "repartidor") {
        pedirPermisoNotificaciones().then((p) => {
          if (p === "granted") suscribirsePush("repartidor", cred.user.uid);
        });
        router.push("/repartidor");
        return;
      }
      if (rol?.rol === "superadmin") {
        router.push("/superadmin");
        return;
      }
      pedirPermisoNotificaciones().then((p) => {
        if (p === "granted") {
          suscribirsePush("admin", cred.user.uid);
        }
      });
      router.push("/admin/pedidos");
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2b1d12] via-[#4a341c] to-[#2b1d12] p-4">
      <div className="bg-[#fffdf6]/95 backdrop-blur p-8 rounded-2xl shadow-xl w-full max-w-sm border-2 border-[#a67c3d]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Panel Administrativo</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-amber-500"
            style={{ color: "#1f2937" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-amber-500"
            style={{ color: "#1f2937" }}
          />
          {error && <p className="text-amber-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-800 text-white py-3 rounded-xl font-bold hover:bg-amber-900 transition disabled:opacity-50 shadow"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
