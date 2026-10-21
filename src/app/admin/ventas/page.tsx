"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Pedido } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RESTAURANT_ID = "restaurante1";

export default function VentasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    if (!user) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
      where("fechaCreacion", ">=", hoy)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
      })) as Pedido[];
      setPedidos(pedidosData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const totalVentas = pedidos.reduce((sum, p) => sum + p.total, 0);
  const pedidosCompletados = pedidos.filter((p) => p.estado === "ENTREGADO").length;

  const productosCount: Record<string, number> = {};
  pedidos.forEach((p) => {
    p.detalles.forEach((d) => {
      productosCount[d.nombre] = (productosCount[d.nombre] || 0) + d.cantidad;
    });
  });

  const productosTop = Object.entries(productosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
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
            <Link href="/admin/ventas" className="text-red-600 font-bold text-lg">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Ventas del día</p>
            <p className="text-3xl font-bold">${totalVentas.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Pedidos del día</p>
            <p className="text-3xl font-bold text-gray-800">{pedidos.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Completados</p>
            <p className="text-3xl font-bold text-green-600">{pedidosCompletados}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Productos más pedidos hoy</h2>
            {productosTop.length === 0 ? (
              <p className="text-gray-500">Sin ventas aún</p>
            ) : (
              <div className="space-y-3">
                {productosTop.map(([nombre, cantidad], idx) => (
                  <div key={nombre} className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-medium text-gray-800">{nombre}</span>
                    <span className="text-gray-500">{cantidad} vendidos</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
