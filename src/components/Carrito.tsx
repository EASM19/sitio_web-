"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Producto, Mesa, DetallePedido } from "@/types";

interface CarritoProps {
  productos: Producto[];
  carrito: Map<string, number>;
  cambiarCantidad: (productoId: string, delta: number) => void;
  total: number;
  mesa: Mesa | null;
  restaurantId: string;
  onClose: () => void;
  onConfirmado: () => void;
}

export default function Carrito({
  productos,
  carrito,
  cambiarCantidad,
  total,
  mesa,
  restaurantId,
  onClose,
  onConfirmado,
}: CarritoProps) {
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");
  const [numeroPedido, setNumeroPedido] = useState(0);

  const items = Array.from(carrito.entries())
    .map(([id, cantidad]) => {
      const prod = productos.find((p) => p.id === id);
      return prod ? { producto: prod, cantidad } : null;
    })
    .filter(Boolean) as { producto: Producto; cantidad: number }[];

  const confirmarPedido = async () => {
    setEnviando(true);
    setError("");

    try {
      const pedidosRef = collection(db, "restaurantes", restaurantId, "pedidos");
      const lastQuery = query(pedidosRef, orderBy("numeroPedido", "desc"), limit(1));
      const lastSnap = await getDocs(lastQuery);
      const nextNumber = lastSnap.empty ? 1 : (lastSnap.docs[0].data().numeroPedido || 0) + 1;

      const detalles: DetallePedido[] = items.map(({ producto, cantidad }) => ({
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio: producto.precio,
        observaciones: "",
      }));

      await addDoc(pedidosRef, {
        restaurantId,
        numeroPedido: nextNumber,
        mesaId: mesa?.id || "",
        mesaNumero: mesa?.numero || "",
        tipo: "MESA",
        estado: "RECIBIDO",
        total,
        fechaCreacion: serverTimestamp(),
        detalles,
      });

      setNumeroPedido(nextNumber);
      setExito(true);
    } catch (err) {
      console.error(err);
      setError("Error al enviar el pedido. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pedido Enviado</h2>
          <p className="text-gray-600 mb-1">
            Pedido <span className="font-bold">#{numeroPedido}</span>
          </p>
          {mesa && <p className="text-gray-600 mb-4">Mesa {mesa.numero}</p>}
          <p className="text-green-600 font-medium mb-6">Estado: Recibido</p>
          <button
            onClick={onConfirmado}
            className="w-full bg-rose-600 text-white py-3 rounded-lg font-semibold hover:bg-rose-700 transition"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Tu Pedido</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tu carrito está vacío</p>
          ) : (
            <div className="space-y-3">
              {items.map(({ producto, cantidad }) => (
                <div key={producto.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{producto.nombre}</p>
                    <p className="text-rose-600 font-bold">${producto.precio.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cambiarCantidad(producto.id, -1)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(producto.id, 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Total</span>
            <span className="text-xl font-bold text-rose-600">${total.toFixed(2)}</span>
          </div>
          {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}
          <button
            onClick={confirmarPedido}
            disabled={items.length === 0 || enviando}
            className="w-full bg-rose-600 text-white py-3 rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? "Enviando..." : "Confirmar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
