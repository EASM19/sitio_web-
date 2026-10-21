"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Pedido } from "@/types";

export default function PedidoPage() {
  const [numeroPedido, setNumeroPedido] = useState("");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);

  const buscarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroPedido.trim()) return;

    setBuscando(true);
    setNoEncontrado(false);
    setPedido(null);

    try {
      const q = query(
        collection(db, "restaurantes", "restaurante1", "pedidos"),
        where("numeroPedido", "==", parseInt(numeroPedido))
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setNoEncontrado(true);
      } else {
        setPedido({ id: snap.docs[0].id, ...snap.docs[0].data() } as Pedido);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuscando(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "RECIBIDO": return "bg-blue-100 text-blue-800";
      case "PREPARANDO": return "bg-yellow-100 text-yellow-800";
      case "LISTO": return "bg-green-100 text-green-800";
      case "ENTREGADO": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Consultar Pedido</h1>
          <p className="text-gray-500 text-sm">Ingresa tu número de pedido</p>
        </div>

        <form onSubmit={buscarPedido} className="flex gap-3 mb-6">
          <input
            type="number"
            value={numeroPedido}
            onChange={(e) => setNumeroPedido(e.target.value)}
            placeholder="Ej: 1025"
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            style={{ color: "#1f2937" }}
          />
          <button
            type="submit"
            disabled={buscando}
            className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 disabled:opacity-50 shadow"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {noEncontrado && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-red-500">Pedido no encontrado</p>
          </div>
        )}

        {pedido && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Pedido #{pedido.numeroPedido}</h2>
                <p className="text-sm text-gray-500">Mesa {pedido.mesaNumero}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getEstadoColor(pedido.estado)}`}>
                {pedido.estado}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {pedido.detalles.map((detalle, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{detalle.cantidad}x {detalle.nombre}</span>
                  <span className="text-gray-800 font-medium">${(detalle.precio * detalle.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-800">Total</span>
              <span className="font-bold text-red-600 text-lg">${pedido.total.toFixed(2)}</span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Recibido</span>
                <span>Preparando</span>
                <span>Listo</span>
                <span>Entregado</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                  style={{
                    width: pedido.estado === "RECIBIDO" ? "25%" :
                           pedido.estado === "PREPARANDO" ? "50%" :
                           pedido.estado === "LISTO" ? "75%" : "100%"
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
