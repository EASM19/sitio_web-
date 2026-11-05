"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RESTAURANT_ID = "restaurante1";

interface ModalOpinionProps {
  pedidoId: string;
  numeroPedido?: number;
  cliente?: string;
  onCerrar: () => void;
}

export default function ModalOpinion({ pedidoId, numeroPedido, cliente, onCerrar }: ModalOpinionProps) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const omitir = () => {
    try {
      localStorage.setItem(`opinion_omitida_${pedidoId}`, "1");
    } catch {
      // ignorado
    }
    onCerrar();
  };

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError("");
    try {
      await addDoc(collection(db, "restaurantes", RESTAURANT_ID, "opiniones"), {
        texto: texto.trim(),
        pedidoId,
        numeroPedido: numeroPedido || null,
        cliente: cliente || "Anónimo",
        leido: false,
        fechaCreacion: serverTimestamp(),
      });
      try {
        localStorage.setItem(`opinion_enviada_${pedidoId}`, "1");
      } catch {
        // ignorado
      }
      setEnviado(true);
      setTimeout(onCerrar, 1500);
    } catch (err) {
      console.error(err);
      setError("No se pudo enviar. Intenta de nuevo.");
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#fffdf6] rounded-2xl border-2 border-[#a67c3d] shadow-2xl max-w-sm w-full p-6 text-center">
        {enviado ? (
          <div className="py-6">
            <p className="text-4xl mb-3">🙏</p>
            <h2 className="text-xl font-bold text-[#2b1d12]">¡Gracias por tu opinión!</h2>
            <p className="text-sm text-gray-500 mt-2">Nos ayuda a mejorar La Bóveda del Real</p>
          </div>
        ) : (
          <>
            <p className="text-3xl mb-2">⭐</p>
            <h2 className="text-xl font-bold text-[#2b1d12]">¿Qué te pareció tu pedido?</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Cuéntanos tu queja o sugerencia{numeroPedido ? ` del pedido #${numeroPedido}` : ""}
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Escribe aquí tu opinión..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-amber-600 text-sm resize-none text-gray-800"
            />
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={omitir}
                disabled={enviando}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Omitir
              </button>
              <button
                onClick={enviar}
                disabled={enviando || !texto.trim()}
                className="flex-1 bg-amber-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-900 disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
