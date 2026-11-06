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
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
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
    if (estrellas < 1 || enviando) return;
    setEnviando(true);
    setError("");
    try {
      await addDoc(collection(db, "restaurantes", RESTAURANT_ID, "opiniones"), {
        estrellas,
        texto: "",
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

  const mostrar = hover || estrellas;
  const etiquetas = ["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente"];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#fffdf6] rounded-2xl border-2 border-[#a67c3d] shadow-2xl max-w-sm w-full p-6 text-center">
        {enviado ? (
          <div className="py-6">
            <p className="text-4xl mb-3">🙏</p>
            <h2 className="text-xl font-bold text-[#2b1d12]">¡Gracias por tu calificación!</h2>
            <p className="text-sm text-gray-500 mt-2">Nos ayuda a mejorar La Bóveda del Real</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-[#2b1d12]">¿Qué te pareció la página?</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Califícanos con estrellas
            </p>
            <div
              className="flex justify-center gap-2 mb-2"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setEstrellas(n)}
                  className="text-4xl sm:text-5xl transition-transform hover:scale-110 leading-none"
                  style={{
                    color: n <= mostrar ? "#d97706" : "#d1d5db",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-amber-700 h-5 mb-2">
              {etiquetas[mostrar]}
            </p>
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
            <div className="flex gap-3 mt-3">
              <button
                onClick={omitir}
                disabled={enviando}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Omitir
              </button>
              <button
                onClick={enviar}
                disabled={enviando || estrellas < 1}
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
