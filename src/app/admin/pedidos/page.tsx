"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Pedido, EstadoPedido } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ESTADOS: EstadoPedido[] = ["RECIBIDO", "PREPARANDO", "LISTO", "ENTREGADO"];

const ESTADO_COLORS: Record<EstadoPedido, string> = {
  RECIBIDO: "bg-blue-50 border-blue-200",
  PREPARANDO: "bg-yellow-50 border-yellow-200",
  LISTO: "bg-green-50 border-green-200",
  ENTREGADO: "bg-gray-50 border-gray-200",
};

const ESTADO_TEXT_COLORS: Record<EstadoPedido, string> = {
  RECIBIDO: "text-blue-700",
  PREPARANDO: "text-yellow-700",
  LISTO: "text-green-700",
  ENTREGADO: "text-gray-700",
};

const ESTADO_BG: Record<EstadoPedido, string> = {
  RECIBIDO: "bg-blue-500",
  PREPARANDO: "bg-yellow-500",
  LISTO: "bg-green-500",
  ENTREGADO: "bg-gray-500",
};

export default function PedidosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const RESTAURANT_ID = "restaurante1";

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

    const q = query(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos"),
      orderBy("fechaCreacion", "desc")
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

  const cambiarEstado = async (pedido: Pedido, nuevoEstado: EstadoPedido) => {
    const pedidoRef = doc(db, "restaurantes", RESTAURANT_ID, "pedidos", pedido.id);
    await updateDoc(pedidoRef, { estado: nuevoEstado });
  };

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
            <Link href="/admin/pedidos" className="text-red-600 font-bold text-lg">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ESTADOS.map((estado) => {
              const pedidosEstado = pedidos.filter((p) => p.estado === estado);
              return (
                <div key={estado} className={`rounded-xl p-4 border ${ESTADO_COLORS[estado]}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${ESTADO_BG[estado]}`}></div>
                    <h2 className={`font-bold ${ESTADO_TEXT_COLORS[estado]}`}>
                      {estado}
                    </h2>
                    <span className="ml-auto bg-white/80 px-2 py-0.5 rounded-full text-sm font-bold">
                      {pedidosEstado.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pedidosEstado.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-4">Sin pedidos</p>
                    ) : (
                      pedidosEstado.map((pedido) => (
                        <div key={pedido.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-lg text-gray-800">#{pedido.numeroPedido}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {pedido.tipo === "MESA" ? `Mesa ${pedido.mesaNumero}` : pedido.tipo === "PARA_LLEVAR" ? "🛍️ Llevar" : "🏠 Domicilio"}
                            </span>
                          </div>
                          {pedido.infoCliente && (
                            <p className="text-xs text-gray-500 mb-2">
                              {pedido.infoCliente.nombre} · {pedido.infoCliente.telefono}
                              {pedido.infoCliente.direccion && ` · ${pedido.infoCliente.direccion}`}
                              {pedido.infoCliente.hora && ` · ${pedido.infoCliente.hora}`}
                            </p>
                          )}
                          <div className="text-sm space-y-1 mb-3">
                            {pedido.detalles.map((detalle, idx) => (
                              <div key={idx} className="flex justify-between text-gray-600">
                                <span>{detalle.cantidad}x {detalle.nombre}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="font-bold text-red-600">
                              ${pedido.total.toFixed(2)}
                            </span>
                            {estado !== "ENTREGADO" && (
                              <button
                                onClick={() => {
                                  const idx = ESTADOS.indexOf(estado);
                                  if (idx < ESTADOS.length - 1) {
                                    cambiarEstado(pedido, ESTADOS[idx + 1]);
                                  }
                                }}
                                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:from-red-600 hover:to-orange-600 transition shadow"
                              >
                                {ESTADOS[ESTADOS.indexOf(estado) + 1]}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
