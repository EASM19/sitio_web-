"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSesionActiva } from "@/hooks/useSesionActiva";
import { useAvisosPedido } from "@/hooks/useAvisosPedido";

const RESTAURANT_ID = "restaurante1";

interface Opinion {
  id: string;
  estrellas?: number;
  texto?: string;
  pedidoId?: string;
  numeroPedido?: number | null;
  cliente?: string;
  leido?: boolean;
  fechaCreacion?: Date;
}

function Estrellas({ n }: { n: number }) {
  return (
    <span className="text-amber-500 tracking-tight" aria-label={`${n} de 5 estrellas`}>
      {"★".repeat(n)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export default function MesasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [opiniones, setOpiniones] = useState<Opinion[]>([]);
  const [verOpiniones, setVerOpiniones] = useState(false);
  const router = useRouter();
  useSesionActiva(user);
  useAvisosPedido(user);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(
        collection(db, "restaurantes", RESTAURANT_ID, "opiniones"),
        orderBy("fechaCreacion", "desc")
      ),
      (snap) => {
        setOpiniones(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
          })) as Opinion[]
        );
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const host = window.location.hostname;
      if (host.includes("vercel.app")) {
        setQrUrl(`${window.location.origin}/pedido-casa`);
      } else {
        const puerto = window.location.port || "3000";
        setQrUrl(`http://192.168.56.1:${puerto}/pedido-casa`);
      }
      if (!u) router.push("/admin/login");
      else setUser(u);
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6efdc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6efdc]">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-gray-500 hover:text-gray-700 font-medium">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <span className="text-amber-800 font-bold">QR</span>
          </div>
          <button onClick={handleLogout} className="text-amber-800 hover:text-amber-900 font-medium">Cerrar sesión</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pt-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Código QR</h1>
          <p className="text-gray-500">Imprímelo y pégalo en las mesas o publícalo en redes sociales</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del QR</label>
            <input
              type="text"
              value={customUrl || qrUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-amber-500"
              style={{ color: "#1f2937" }}
            />
            <p className="text-xs text-gray-400 mt-1">Para probar desde tu celular usa la IP de tu red. Para producción usa la URL de Vercel.</p>
          </div>
          <div className="bg-gray-50 inline-block p-6 rounded-2xl border border-gray-200 mb-4">
            <QRCodeSVG value={customUrl || qrUrl} size={220} />
          </div>
          <p className="text-sm text-gray-500 break-all mb-4">{customUrl || qrUrl}</p>
          <div className="flex gap-3 justify-center">
            <a
              href={customUrl || qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-800 text-white px-6 py-3 rounded-xl font-bold shadow"
            >
              Probar como cliente
            </a>
            <Link
              href="/admin/seed"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200"
            >
              Datos de prueba
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-4">
          <h2 className="font-bold text-gray-800 mb-2">¿Cómo usar el QR?</h2>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Imprime este QR y pégalo en cada mesa</li>
            <li>Publícalo en Instagram, Facebook, WhatsApp</li>
            <li>El cliente escanea y ve el menú directo</li>
            <li>Agrega productos y confirma su pedido</li>
            <li>El pedido aparece en tu panel de Pedidos</li>
          </ol>
        </div>

        <button
          onClick={() => setVerOpiniones(true)}
          className="mt-4 w-full bg-[#2b1d12] text-[#f0e2c4] py-4 rounded-2xl font-bold shadow-lg border-2 border-[#a67c3d] flex items-center justify-center gap-2 hover:bg-[#3a2817] transition"
        >
          ⭐ Calificaciones
          {opiniones.filter((o) => !o.leido).length > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center">
              {opiniones.filter((o) => !o.leido).length}
            </span>
          )}
          <span className="text-xs font-normal opacity-70">({opiniones.length})</span>
        </button>
      </main>

      {verOpiniones && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#fffdf6] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border-2 border-[#a67c3d] shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200">
              <h2 className="text-lg font-bold text-[#2b1d12]">
                ⭐ Calificaciones de clientes
                <span className="ml-2 text-xs font-normal text-gray-500">({opiniones.length})</span>
              </h2>
              <button
                onClick={() => setVerOpiniones(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {opiniones.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-10">
                  Aún no hay opiniones de clientes
                </p>
              )}
              {opiniones.map((o) => (
                <div
                  key={o.id}
                  className={`bg-white rounded-xl p-4 border shadow-sm ${
                    o.leido ? "border-gray-100" : "border-amber-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-[#2b1d12]">
                      {o.cliente || "Anónimo"}
                      {o.numeroPedido ? ` · Pedido #${o.numeroPedido}` : ""}
                    </span>
                    {!o.leido && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Nuevo
                      </span>
                    )}
                  </div>
                  <div className="text-lg mb-1">
                    {typeof o.estrellas === "number" && o.estrellas > 0 ? (
                      <Estrellas n={o.estrellas} />
                    ) : o.texto ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{o.texto}</p>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin calificación</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">
                      {o.fechaCreacion?.toLocaleString("es-MX", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex gap-2">
                      {!o.leido && (
                        <button
                          onClick={() =>
                            updateDoc(doc(db, "restaurantes", RESTAURANT_ID, "opiniones", o.id), {
                              leido: true,
                            })
                          }
                          className="text-xs text-amber-800 font-bold hover:underline"
                        >
                          Marcar leído
                        </button>
                      )}
                      <button
                        onClick={() =>
                          deleteDoc(doc(db, "restaurantes", RESTAURANT_ID, "opiniones", o.id))
                        }
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
