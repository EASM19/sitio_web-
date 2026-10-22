"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Pedido } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RESTAURANT_ID = "restaurante1";

function claveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function VentasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSel, setFechaSel] = useState("");
  const [verTodo, setVerTodo] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/admin/login");
      } else {
        setUser(u);
        setFechaSel(claveDia(new Date()));
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

  const pedidosFiltrados = useMemo(() => {
    if (verTodo) return pedidos;
    return pedidos.filter((p) => claveDia(p.fechaCreacion) === fechaSel);
  }, [pedidos, fechaSel, verTodo]);

  const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + p.total, 0);
  const pedidosCompletados = pedidosFiltrados.filter((p) => p.estado === "ENTREGADO").length;

  const productosCount: Record<string, number> = {};
  pedidosFiltrados.forEach((p) => {
    p.detalles.forEach((d) => {
      productosCount[d.nombre] = (productosCount[d.nombre] || 0) + d.cantidad;
    });
  });

  const productosTop = Object.entries(productosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const historial = useMemo(() => {
    const porDia = new Map<string, { total: number; count: number; entregados: number }>();
    pedidos.forEach((p) => {
      const clave = claveDia(p.fechaCreacion);
      const actual = porDia.get(clave) || { total: 0, count: 0, entregados: 0 };
      actual.total += p.total;
      actual.count += 1;
      if (p.estado === "ENTREGADO") actual.entregados += 1;
      porDia.set(clave, actual);
    });
    return Array.from(porDia.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30);
  }, [pedidos]);

  const etiquetaPeriodo = verTodo
    ? "todo el historial"
    : new Date(fechaSel + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-gray-500 hover:text-gray-700 font-medium">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-rose-600 font-bold text-lg">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <button onClick={handleLogout} className="text-rose-600 hover:text-rose-700 font-medium">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-3">
          <span className="font-bold text-gray-800">📅 Ver ventas de:</span>
          <input
            type="date"
            value={fechaSel}
            onChange={(e) => {
              setFechaSel(e.target.value);
              setVerTodo(false);
            }}
            disabled={verTodo}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm disabled:opacity-50"
            style={{ color: "#1f2937" }}
          />
          <button
            onClick={() => {
              setFechaSel(claveDia(new Date()));
              setVerTodo(false);
            }}
            className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-700"
          >
            Hoy
          </button>
          <button
            onClick={() => setVerTodo(!verTodo)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${
              verTodo
                ? "bg-rose-50 border-rose-500 text-rose-600"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todo el historial
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-rose-600 rounded-xl p-6 text-white shadow-lg">
            <p className="text-sm opacity-90 capitalize">Ventas · {etiquetaPeriodo}</p>
            <p className="text-3xl font-bold">${totalVentas.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 capitalize">Pedidos · {etiquetaPeriodo}</p>
            <p className="text-3xl font-bold text-gray-800">{pedidosFiltrados.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Completados</p>
            <p className="text-3xl font-bold text-green-600">{pedidosCompletados}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4">🏆 Productos más pedidos</h2>
                {productosTop.length === 0 ? (
                  <p className="text-gray-500">Sin ventas en este periodo</p>
                ) : (
                  <div className="space-y-3">
                    {productosTop.map(([nombre, cantidad], idx) => (
                      <div key={nombre} className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold text-sm">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-medium text-gray-800">{nombre}</span>
                        <span className="text-gray-500">{cantidad} vendidos</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4">📆 Historial (últimos 30 días)</h2>
                {historial.length === 0 ? (
                  <p className="text-gray-500">Aún no hay ventas registradas</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {historial.map(([dia, info]) => {
                      const [a, m, d] = dia.split("-").map(Number);
                      const fecha = new Date(a, m - 1, d);
                      const esHoy = dia === claveDia(new Date());
                      return (
                        <button
                          key={dia}
                          onClick={() => {
                            setFechaSel(dia);
                            setVerTodo(false);
                          }}
                          className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm border transition ${
                            !verTodo && fechaSel === dia
                              ? "border-rose-500 bg-rose-50"
                              : "border-gray-100 hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-left">
                            <span className="font-bold text-gray-800">
                              {esHoy ? "Hoy" : fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                            <span className="text-gray-400 ml-2">
                              {info.count} pedido{info.count !== 1 ? "s" : ""} · {info.entregados} entregado{info.entregados !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <span className="font-bold text-rose-600">${info.total.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!loading && pedidosFiltrados.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🧾 Pedidos del periodo</h2>
            <div className="space-y-2">
              {pedidosFiltrados.slice(0, 50).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm border-b border-gray-50 py-2">
                  <div>
                    <span className="font-bold text-gray-800">#{p.numeroPedido}</span>
                    <span className="text-gray-400 ml-2">
                      {p.fechaCreacion.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.estado === "ENTREGADO" ? "bg-green-100 text-green-700" :
                      p.estado === "LISTO" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {p.estado}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {p.infoCliente?.nombre || p.clienteEmail || ""}
                    </span>
                  </div>
                  <span className="font-bold text-rose-600">${p.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
