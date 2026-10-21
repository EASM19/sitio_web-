"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MesasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    const ip = window.location.hostname;
    const puerto = window.location.port || "3000";
    const base = ip === "localhost" ? `http://192.168.56.1:${puerto}` : `${window.location.origin}`;
    setQrUrl(`${base}/pedido-casa`);
    const unsub = onAuthStateChanged(auth, (u) => {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-gray-500 hover:text-gray-700 font-medium">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <span className="text-red-600 font-bold">QR</span>
          </div>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium">Cerrar sesión</button>
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-red-400"
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
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow"
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
      </main>
    </div>
  );
}
