"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit,
  doc, getDoc, setDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, GoogleAuthProvider, User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { suscribirsePush, obtenerSuscripciones, enviarNotificacionPush } from "@/lib/push";
import RelojHora from "@/components/RelojHora";
import type { Producto, Categoria, DetallePedido } from "@/types";

type TipoPedido = "MESA" | "PARA_LLEVAR" | "DOMICILIO";
type Vista = "menu" | "login" | "checkout";

type PromptInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const RESTAURANT_ID = "restaurante1";

export default function PedidoCasaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<Map<string, number>>(new Map());
  const [vista, setVista] = useState<Vista>("menu");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");
  const [numeroPedido, setNumeroPedido] = useState(0);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccionGuardada, setDireccionGuardada] = useState("");
  const [usarDirGuardada, setUsarDirGuardada] = useState(true);
  const [direccionNueva, setDireccionNueva] = useState("");
  const [referencia, setReferencia] = useState("");

  const [tipo, setTipo] = useState<TipoPedido>("MESA");
  const [mesaNumero, setMesaNumero] = useState("");
  const [hora, setHora] = useState("");
  const [ingresando, setIngresando] = useState(false);

  const [promptInstalar, setPromptInstalar] = useState<PromptInstalar | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [appInstalada, setAppInstalada] = useState(false);
  const [ayudaIOS, setAyudaIOS] = useState(false);
  const [splash, setSplash] = useState<"visible" | "saliendo" | "oculto">("visible");
  const inicioSplash = useRef(0);

  useEffect(() => {
    inicioSplash.current = Date.now();
  }, []);

  useEffect(() => {
    if (splash !== "visible" || loading) return;
    const espera = Math.max(0, 2400 - (Date.now() - inicioSplash.current));
    const t = setTimeout(() => {
      setSplash("saliendo");
      window.setTimeout(() => setSplash("oculto"), 550);
    }, espera);
    return () => clearTimeout(t);
  }, [loading, splash]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setTimeout(() => {
      setAppInstalada(standalone);
      setEsIOS(ios);
    }, 0);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptInstalar(e as PromptInstalar);
    };
    const onInstalada = () => {
      setPromptInstalar(null);
      setAppInstalada(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalada);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalada);
    };
  }, []);

  const instalarApp = async () => {
    if (promptInstalar) {
      try {
        await promptInstalar.prompt();
        const res = await promptInstalar.userChoice;
        if (res.outcome === "accepted") setPromptInstalar(null);
      } catch {
        // ignorado
      }
      return;
    }
    if (esIOS) setAyudaIOS(true);
  };

  const mostrarInstalar = !appInstalada && (promptInstalar !== null || esIOS);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        suscribirsePush("cliente", u.uid);
        if (sessionStorage.getItem("irCheckout") === "1") {
          sessionStorage.removeItem("irCheckout");
          setVista("checkout");
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    (async () => {
      try {
        const snap = await getDoc(
          doc(db, "restaurantes", RESTAURANT_ID, "clientes", user.uid)
        );
        if (cancelado || !snap.exists()) return;
        const d = snap.data();
        setNombre((prev) => prev || d.nombre || "");
        setTelefono((prev) => prev || d.telefono || "");
        if (d.direccion) {
          setDireccionGuardada(d.direccion);
          setUsarDirGuardada(true);
        }
        setReferencia((prev) => prev || d.referencia || "");
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [user]);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const catQuery = query(
          collection(db, "restaurantes", RESTAURANT_ID, "categorias"),
          where("estado", "==", "activa")
        );
        const catSnap = await getDocs(catQuery);
        const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria);
        cats.sort((a, b) => a.orden - b.orden);
        setCategorias(cats);

        const prodQuery = query(
          collection(db, "restaurantes", RESTAURANT_ID, "productos"),
          where("estado", "==", "activo")
        );
        const prodSnap = await getDocs(prodQuery);
        setProductos(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    cargarDatos();
  }, []);

  const iniciarCheckout = () => {
    if (authLoading) return;
    setVista("checkout");
  };

  const entrarConGoogle = async () => {
    setIngresando(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      suscribirsePush("cliente", cred.user.uid);
      setVista("checkout");
    } catch (err) {
      console.error(err);
      const codigo = (err as { code?: string }).code || "";
      if (codigo === "auth/popup-blocked") {
        sessionStorage.setItem("irCheckout", "1");
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      } else if (codigo === "auth/operation-not-allowed") {
        setError("Activa el proveedor Google en Firebase Console → Authentication → Sign-in method.");
      } else if (codigo === "auth/popup-closed-by-user") {
        setError("Cerraste la ventana de Google. Intenta de nuevo.");
      } else {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setIngresando(false);
    }
  };

  const salir = async () => {
    await signOut(auth);
    setNombre("");
    setTelefono("");
    setDireccionGuardada("");
    setReferencia("");
    setVista("menu");
  };

  const agregar = (id: string) => {
    setCarrito((p) => { const n = new Map(p); n.set(id, (n.get(id) || 0) + 1); return n; });
  };

  const cambiar = (id: string, delta: number) => {
    setCarrito((p) => {
      const n = new Map(p);
      const a = (n.get(id) || 0) + delta;
      if (a <= 0) n.delete(id); else n.set(id, a);
      return n;
    });
  };

  const total = Array.from(carrito.entries()).reduce((t, [id, cant]) => {
    const p = productos.find((x) => x.id === id);
    return t + (p ? p.precio * cant : 0);
  }, 0);

  const cantTotal = Array.from(carrito.values()).reduce((a, b) => a + b, 0);

  const direccionFinal =
    tipo === "DOMICILIO"
      ? usarDirGuardada && direccionGuardada
        ? direccionGuardada
        : direccionNueva
      : direccionGuardada;

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setError("Completa tu nombre y teléfono.");
      return;
    }
    if (tipo === "DOMICILIO" && !direccionFinal) {
      setError("Agrega tu dirección de entrega.");
      return;
    }
    if (tipo === "PARA_LLEVAR" && !hora) {
      setError("Elige la hora de recoger.");
      return;
    }
    if (tipo === "MESA" && !mesaNumero.trim()) {
      setError("Escribe el número de mesa.");
      return;
    }
    const requiereLogin = tipo === "PARA_LLEVAR" || tipo === "DOMICILIO";
    if (requiereLogin && !user) {
      sessionStorage.setItem("irCheckout", "1");
      setVista("login");
      return;
    }

    setEnviando(true);
    setError("");
    try {
      const ref = collection(db, "restaurantes", RESTAURANT_ID, "pedidos");
      const lastQ = query(ref, orderBy("numeroPedido", "desc"), limit(1));
      const lastS = await getDocs(lastQ);
      const next = lastS.empty ? 1 : (lastS.docs[0].data().numeroPedido || 0) + 1;

      const detalles: DetallePedido[] = Array.from(carrito.entries())
        .map(([id, cant]) => {
          const p = productos.find((x) => x.id === id);
          return p ? { productoId: id, nombre: p.nombre, cantidad: cant, precio: p.precio, observaciones: "" } : null;
        })
        .filter(Boolean) as DetallePedido[];

      const docRef = await addDoc(ref, {
        restaurantId: RESTAURANT_ID,
        numeroPedido: next,
        mesaId: tipo === "MESA" ? mesaNumero : "",
        mesaNumero: tipo === "MESA" ? mesaNumero : "",
        tipo,
        estado: "RECIBIDO",
        total,
        fechaCreacion: serverTimestamp(),
        detalles,
        uid: user?.uid || "",
        clienteEmail: user?.email || "",
        infoCliente: {
          nombre,
          telefono,
          direccion: direccionFinal,
          referencia: tipo === "DOMICILIO" ? referencia.trim() : "",
          hora,
        },
      });

      if (user) {
        await setDoc(
          doc(db, "restaurantes", RESTAURANT_ID, "clientes", user.uid),
          {
            uid: user.uid,
            email: user.email || "",
            nombre,
            telefono,
            direccion: direccionGuardada || (tipo === "DOMICILIO" ? direccionNueva : ""),
            ...(tipo === "DOMICILIO" ? { referencia: referencia.trim() } : {}),
            actualizado: serverTimestamp(),
          },
          { merge: true }
        );
      }

      try {
        localStorage.setItem(
          "miPedido",
          JSON.stringify({ id: docRef.id, numero: next })
        );
      } catch {
        // almacenamiento no disponible
      }

      const resumen = detalles.map((d) => `${d.cantidad}x ${d.nombre}`).join(", ");
      obtenerSuscripciones({ tipo: "admin" }).then((subs) =>
        enviarNotificacionPush(
          `🔔 Nuevo pedido #${next}`,
          `${resumen} — $${total.toFixed(2)}`,
          "/admin/pedidos",
          subs
        )
      );

      setNumeroPedido(next);
      setExito(true);
    } catch (err) {
      console.error(err);
      setError("Error al enviar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (splash !== "oculto") {
    return (
      <div
        className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
          splash === "saliendo" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className="relative"
          style={{ height: "min(96vh, 701px)", aspectRatio: "470 / 701", maxWidth: "100vw" }}
        >
          <img
            src="/logo-menu.png"
            alt="La Bóveda del Real"
            className="absolute inset-0 w-full h-full object-cover animate-pulse"
          />
          <div className="absolute left-0 right-0 flex justify-center" style={{ top: "66%" }}>
            <span
              className="text-sm sm:text-base font-bold tracking-[0.35em] animate-pulse"
              style={{ color: "#e3c07a", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
            >
              Entrando...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6efdc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-[#f6efdc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pedido Enviado</h2>
          <p className="text-gray-600 mb-1">Pedido <span className="font-bold">#{numeroPedido}</span></p>
          <p className="text-green-600 font-medium mb-6">Estado: Recibido</p>
          <a
            href="/pedido"
            className="block w-full bg-amber-800 text-white py-3 rounded-xl font-bold shadow mb-3"
          >
            Ver estado de mi pedido
          </a>
          <button
            onClick={() => { setExito(false); setCarrito(new Map()); setVista("menu"); }}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  if (vista === "login") {
    return (
      <div className="min-h-screen bg-[#f6efdc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Inicia sesión para continuar</h2>
          <p className="text-gray-500 text-sm mb-6">
            Para pedidos de <b>recoger</b> o <b>domicilio</b> necesitamos tu cuenta de Google
            para guardarte tus datos y poder avisarte del estado de tu pedido.
            <br />
            <span className="text-xs">Los pedidos a mesa no requieren sesión.</span>
          </p>
          <button
            onClick={entrarConGoogle}
            disabled={ingresando}
            className="w-full border-2 border-gray-200 bg-white text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            {ingresando ? "Ingresando..." : "Continuar con Google"}
          </button>
          {error && <p className="text-amber-600 text-sm mb-3">{error}</p>}
          <button
            onClick={() => {
              sessionStorage.removeItem("irCheckout");
              setVista("menu");
              setError("");
            }}
            className="text-amber-800 font-bold text-sm"
          >
            ← Volver al menú
          </button>
          <div className="border-t mt-4 pt-4">
            <p className="text-gray-400 text-xs mb-2">¿Solo quieres consultar un pedido?</p>
            <a href="/pedido" className="text-amber-800 font-bold text-sm">Consultar pedido sin cuenta</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6efdc] pb-24">
      <header className="bg-[#2b1d12] text-[#f0e2c4] p-4 sticky top-0 z-10 shadow-lg border-b-4 border-[#a67c3d]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold tracking-wide truncate">La Bóveda del Real</h1>
            <Link
              href="/menu"
              className="text-xs bg-white/15 hover:bg-white/25 px-2 py-1 rounded-lg whitespace-nowrap"
              title="Ver menú ilustrado"
            >
              📖 Menú
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {mostrarInstalar && (
              <button
                onClick={instalarApp}
                className="bg-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow"
                title="Instalar la aplicación"
              >
                📲 Instalar
              </button>
            )}
            {user && (
              <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded-lg hidden sm:inline">
                {user.email}
              </span>
            )}
            {cantTotal > 0 && vista === "menu" && (
              <button
                onClick={iniciarCheckout}
                className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-sm font-bold"
              >
                Carrito ({cantTotal}) ${total.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {vista === "checkout" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setVista("menu")} className="text-amber-800 font-bold">
                ← Volver al menú
              </button>
              {user && (
                <button onClick={salir} className="text-gray-400 text-sm">
                  No eres {user.displayName?.split(" ")[0] || "tú"}? Salir
                </button>
              )}
            </div>
            <form onSubmit={confirmar} className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-3">¿Cómo quieres tu pedido?</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(["MESA", "PARA_LLEVAR", "DOMICILIO"] as TipoPedido[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                        tipo === t
                          ? "border-amber-600 bg-amber-50 text-amber-800"
                          : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {t === "MESA" ? "🪑 Mesa" : t === "PARA_LLEVAR" ? "🛍️ Recoger" : "🏠 Domicilio"}
                    </button>
                  ))}
                </div>

                {tipo === "MESA" && (
                  <input
                    type="text"
                    value={mesaNumero}
                    onChange={(e) => setMesaNumero(e.target.value)}
                    placeholder="Número de mesa *"
                    className="w-full mt-3 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                    style={{ color: "#1f2937" }}
                  />
                )}
                {tipo === "DOMICILIO" && (
                  <div className="mt-3 space-y-2">
                    {direccionGuardada && (
                      <div className="space-y-2">
                        <label className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl border-2 border-gray-200 cursor-pointer">
                          <input
                            type="radio"
                            name="dir"
                            checked={usarDirGuardada}
                            onChange={() => setUsarDirGuardada(true)}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-700">
                            <span className="font-bold">Mi dirección guardada:</span>
                            <br />
                            {direccionGuardada}
                          </span>
                        </label>
                        <label className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl border-2 border-gray-200 cursor-pointer">
                          <input
                            type="radio"
                            name="dir"
                            checked={!usarDirGuardada}
                            onChange={() => setUsarDirGuardada(false)}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-700 font-bold">Enviar a otra dirección</span>
                        </label>
                      </div>
                    )}
                    {!usarDirGuardada || !direccionGuardada ? (
                      <textarea
                        value={direccionNueva}
                        onChange={(e) => setDireccionNueva(e.target.value)}
                        placeholder="Dirección completa *"
                        rows={2}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none"
                        style={{ color: "#1f2937" }}
                      />
                    ) : null}
                    <textarea
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Referencia para ubicarlo (ej: frente al parque, casa azul, portón negro)"
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none"
                      style={{ color: "#1f2937" }}
                    />
                  </div>
                )}
                {tipo === "PARA_LLEVAR" && (
                  <div className="mt-3">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      🕐 ¿A qué hora recoges tu pedido? *
                    </label>
                    <RelojHora valor={hora} onChange={setHora} />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                <h2 className="font-bold text-gray-800">Tus datos</h2>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre *"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                  style={{ color: "#1f2937" }}
                />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Teléfono *"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                  style={{ color: "#1f2937" }}
                />
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-2">Tu pedido</h2>
                {Array.from(carrito.entries()).map(([id, cant]) => {
                  const p = productos.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex justify-between text-sm py-1">
                      <span>{cant}x {p.nombre}</span>
                      <span>${(p.precio * cant).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-amber-800">${total.toFixed(2)}</span>
                </div>
              </div>

              {error && <p className="text-amber-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-amber-800 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Confirmar Pedido"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="-mx-4 -mt-4 mb-2 relative overflow-hidden">
              <div className="absolute inset-0">
                <img src="/menu/hero.jpg" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/55" />
              </div>
              <div className="relative px-6 py-10 text-center">
                <img src="/menu/logo.png" alt="La Bóveda Del Real" className="w-40 sm:w-48 h-auto mx-auto mb-5 drop-shadow-2xl" />
                <p className="font-serif text-lg sm:text-xl text-[#f0e2c4]">
                  Donde la historia y la comida se fusionan.
                </p>
                <p className="font-serif text-base sm:text-lg text-[#f0e2c4]/90 mt-5 mb-2">
                  ¡Síguenos en redes!
                </p>
                <div className="flex items-center justify-center gap-5">
                  <a
                    href="https://www.instagram.com/labovedadelreal"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img src="/menu/instagram.png" alt="Instagram" width={44} height={44} />
                  </a>
                  <a
                    href="https://www.facebook.com/share/1BzRuv79S6/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img src="/menu/facebook.png" alt="Facebook" width={44} height={44} />
                  </a>
                </div>
              </div>
            </section>
            {categorias.map((cat) => {
              const prods = productos.filter((p) => p.categoriaId === cat.id && p.disponible);
              if (prods.length === 0) return null;
              return (
                <section key={cat.id}>
                  <h2 className="text-lg font-bold text-[#2b1d12] border-b-2 border-[#a67c3d] pb-1 mb-3">{cat.nombre}</h2>
                  <div className="space-y-3">
                    {prods.map((prod) => {
                      const cant = carrito.get(prod.id) || 0;
                      return (
                        <div key={prod.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
                          {prod.imagen ? (
                            <img src={prod.imagen} alt={prod.nombre} loading="lazy" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-2xl">🍽️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2">
                              <h3 className="font-semibold text-gray-800">{prod.nombre}</h3>
                              <span className="text-amber-800 font-bold">${prod.precio.toFixed(2)}</span>
                            </div>
                            {prod.descripcion && <p className="text-sm text-gray-500 mt-1">{prod.descripcion}</p>}
                            {prod.ingredientes && <p className="text-xs text-gray-400 mt-1">{prod.ingredientes}</p>}
                            <div className="mt-2">
                              {cant === 0 ? (
                                <button onClick={() => agregar(prod.id)} className="bg-amber-800 text-white px-4 py-1.5 rounded-lg text-sm font-bold">
                                  Agregar
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => cambiar(prod.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold">-</button>
                                  <span className="font-bold w-6 text-center">{cant}</span>
                                  <button onClick={() => agregar(prod.id)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold">+</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {categorias.length === 0 && (
              <p className="text-center text-gray-500 py-12">No hay productos disponibles aún.</p>
            )}
          </div>
        )}
      </main>

      {cantTotal > 0 && vista === "menu" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold">{cantTotal} productos</p>
              <p className="text-amber-800 font-bold text-lg">${total.toFixed(2)}</p>
            </div>
            <button
              onClick={iniciarCheckout}
              className="bg-amber-800 text-white px-6 py-3 rounded-xl font-bold shadow"
            >
              Hacer Pedido
            </button>
          </div>
        </div>
      )}

      {ayudaIOS && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAyudaIOS(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-gray-800 mb-3">📲 Instalar ShopQR</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>
                Toca el botón <b>Compartir</b> ⬆️ (en Safari)
              </li>
              <li>
                Elige <b>Añadir a pantalla de inicio</b>
              </li>
              <li>
                Toca <b>Añadir</b> en la esquina superior
              </li>
            </ol>
            <p className="text-xs text-gray-400 mt-3">
              La app quedará en tu pantalla principal con el icono de ShopQR. Al abrirla
              podrás pedir igual que en la página.
            </p>
            <button
              onClick={() => setAyudaIOS(false)}
              className="mt-4 w-full bg-amber-800 text-white py-2.5 rounded-xl font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
