"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { fileToDataUrl } from "@/lib/image";
import { consultarRol, consultarRolEn } from "@/lib/roles";
import {
  CONFIGURACION_PUBLICA_DEFECTO,
  escucharRestaurantes,
  pedirAccionRestaurante,
  resolverConfiguracionPublica,
  type ConfiguracionPublica,
  type RegistroRestaurante,
} from "@/lib/restaurantes";
import {
  fijarRestaurante, useRestauranteActual,
} from "@/hooks/useRestauranteActual";
import { useSesionActiva } from "@/hooks/useSesionActiva";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AjustesPage() {
  const { rid, listo } = useRestauranteActual();
  const [user, setUser] = useState<User | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [esSuperadmin, setEsSuperadmin] = useState(false);
  const [restaurantes, setRestaurantes] = useState<RegistroRestaurante[]>([]);
  const [nombreRest, setNombreRest] = useState("");
  const [slug, setSlug] = useState("");
  const [config, setConfig] = useState<ConfiguracionPublica>(
    CONFIGURACION_PUBLICA_DEFECTO
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();
  useSesionActiva(user);

  useEffect(() => {
    if (!listo) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/admin/login");
        return;
      }
      setUser(u);
      const [general, aqui] = await Promise.all([
        consultarRol(u.uid),
        consultarRolEn(rid, u.uid),
      ]);
      if (general.estado !== "ok" || aqui.estado !== "ok") {
        setVerificando(false);
        return;
      }
      const superadmin =
        general.usuario?.rol === "superadmin" &&
        general.usuario.activo !== false;
      const duenoAqui = aqui.usuario?.rol === "dueno" && aqui.usuario.activo !== false;
      const repartidorAqui =
        aqui.usuario?.rol === "repartidor" && aqui.usuario.activo !== false;
      if (repartidorAqui) {
        router.push("/repartidor");
        return;
      }
      if (!superadmin && !duenoAqui) {
        router.push("/admin/login");
        return;
      }
      setEsSuperadmin(superadmin);
      setAutorizado(true);
      setVerificando(false);
    });
    return () => unsub();
  }, [listo, rid, router]);

  useEffect(() => {
    if (!esSuperadmin) return;
    return escucharRestaurantes(setRestaurantes);
  }, [esSuperadmin]);

  useEffect(() => {
    let vigente = true;
    getDoc(doc(db, "restaurantes", rid))
      .then((s) => {
        if (!vigente) return;
        const reg = s.exists() ? s.data() : null;
        setNombreRest(String(reg?.nombre || rid));
        setSlug(String(reg?.slug || rid));
        setConfig(resolverConfiguracionPublica(reg?.configuracion));
      })
      .catch(() => {
        if (vigente) setNombreRest(rid);
      });
    return () => {
      vigente = false;
    };
  }, [rid]);

  const cambiarImagen = async (campo: "logo" | "hero", file?: File) => {
    if (!file) return;
    setError("");
    try {
      const data = await fileToDataUrl(file, 900, 0.72);
      setConfig((prev) => ({ ...prev, [campo]: data }));
    } catch {
      setError("No se pudo procesar la imagen. Prueba con otro archivo.");
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !autorizado || guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    const r = await pedirAccionRestaurante(user, {
      accion: "actualizar-config",
      rid,
      configuracion: config,
    });
    if (r.ok) {
      setMensaje("Ajustes guardados. Ya aparecen en el QR y en el menú.");
    } else {
      setError(r.data.error || "No se pudo guardar. Intenta de nuevo.");
    }
    setGuardando(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (verificando || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6efdc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }
  if (!autorizado) return null;

  const urlMenu = `/menu?r=${encodeURIComponent(slug || rid)}`;

  return (
    <div className="min-h-screen bg-[#f6efdc]">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/admin/pedidos" className="text-gray-500 hover:text-gray-700 font-medium">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
            <span className="text-amber-800 font-bold">⚙️ Ajustes</span>
            {esSuperadmin && (
              <Link href="/superadmin" className="text-purple-700 hover:text-purple-900 font-medium">
                👑 Superadmin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!esSuperadmin && (
              <span className="max-w-[170px] truncate text-xs font-bold text-gray-600" title={nombreRest}>
                🏪 {nombreRest}
              </span>
            )}
            {esSuperadmin && (
              <select
                value={restaurantes.some((r) => r.id === rid) ? rid : ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  fijarRestaurante(e.target.value);
                  router.push(`/admin/ajustes?r=${encodeURIComponent(e.target.value)}`);
                }}
                title="Restaurante que estás ajustando"
                className="max-w-[190px] px-2 py-1.5 border-2 border-purple-200 rounded-lg text-xs font-bold bg-white"
                style={{ color: "#1f2937" }}
              >
                {!restaurantes.some((r) => r.id === rid) && (
                  <option value="">Elige restaurante…</option>
                )}
                {restaurantes.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            )}
            <button onClick={handleLogout} className="text-amber-800 hover:text-amber-900 font-medium">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={guardar} className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ajustes de {nombreRest || rid}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tu imagen y tus redes se muestran al entrar por QR y en el menú de este restaurante.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-gray-800">🖼️ Imágenes</h2>
            {(["logo", "hero"] as const).map((campo) => (
              <div key={campo}>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {campo === "logo" ? "Logo del restaurante" : "Imagen de portada"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => cambiarImagen(campo, e.target.files?.[0])}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-800 file:text-white file:px-3 file:py-2 file:font-bold"
                  style={{ color: "#4b5563" }}
                />
                <input
                  type="text"
                  value={config[campo].startsWith("data:") ? "" : config[campo]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [campo]: e.target.value.trim() }))}
                  placeholder="O pega una URL https://…"
                  className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500"
                  style={{ color: "#1f2937" }}
                />
                {config[campo] && (
                  <img
                    src={config[campo]}
                    alt={campo === "logo" ? "Vista previa del logo" : "Vista previa de la portada"}
                    className={`mt-2 rounded-lg object-contain border border-gray-100 ${campo === "logo" ? "h-24" : "h-28 w-full object-cover"}`}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({ ...prev, logo: "", hero: "" }))
              }
              className="text-xs text-gray-500 hover:text-gray-700 font-bold"
            >
              Restablecer imágenes originales
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-gray-800">📲 Redes sociales y texto</h2>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Instagram</label>
              <input
                type="url"
                value={config.instagram}
                onChange={(e) => setConfig((prev) => ({ ...prev, instagram: e.target.value.trim() }))}
                placeholder="https://instagram.com/tu-restaurante"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500"
                style={{ color: "#1f2937" }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Facebook</label>
              <input
                type="url"
                value={config.facebook}
                onChange={(e) => setConfig((prev) => ({ ...prev, facebook: e.target.value.trim() }))}
                placeholder="https://facebook.com/tu-restaurante"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500"
                style={{ color: "#1f2937" }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Frase del menú</label>
              <input
                type="text"
                value={config.frase}
                onChange={(e) => setConfig((prev) => ({ ...prev, frase: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500"
                style={{ color: "#1f2937" }}
              />
            </div>
          </div>

          {error && <p className="text-sm font-bold text-amber-700">{error}</p>}
          {mensaje && <p className="text-sm font-bold text-green-700">{mensaje}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-amber-800 text-white py-3 rounded-xl font-bold shadow disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar ajustes"}
          </button>
          <div className="flex gap-3">
            <Link
              href={urlMenu}
              target="_blank"
              className="flex-1 text-center bg-white text-amber-800 py-2.5 rounded-xl font-bold border border-amber-100"
            >
              Ver menú público
            </Link>
            <Link
              href="/admin/mesas"
              className="flex-1 text-center bg-white text-amber-800 py-2.5 rounded-xl font-bold border border-amber-100"
            >
              Ver QR
            </Link>
          </div>
        </form>

        <section className="bg-[#1a1410] text-[#f0e2c4] rounded-2xl overflow-hidden shadow-lg self-start">
          <div className="relative h-56">
            <img
              src={config.hero || CONFIGURACION_PUBLICA_DEFECTO.hero}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <img
                src={config.logo || "/menu/logo.png"}
                alt={nombreRest || "Restaurante"}
                className="w-28 h-20 object-contain mb-3 drop-shadow-2xl"
              />
              <p className="font-serif text-lg">{nombreRest || rid}</p>
              <p className="font-serif text-sm text-[#f0e2c4]/90 mt-2">{config.frase}</p>
              <div className="flex gap-4 mt-3">
                {config.instagram && (
                  <a href={config.instagram} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline">
                    Instagram
                  </a>
                )}
                {config.facebook && (
                  <a href={config.facebook} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline">
                    Facebook
                  </a>
                )}
              </div>
            </div>
          </div>
          <p className="p-5 text-xs text-[#f0e2c4]/60 text-center">
            Así se verá la cabecera que ven tus clientes.
          </p>
        </section>
      </main>
    </div>
  );
}
