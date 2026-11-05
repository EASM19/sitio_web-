"use client";

import { useState } from "react";

interface RelojHoraProps {
  valor: string;
  onChange: (v: string) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const HORAS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const posicion = (i: number) => {
  const rad = ((i * 30 - 90) * Math.PI) / 180;
  return {
    left: `calc(50% + ${Math.cos(rad) * 104}px)`,
    top: `calc(50% + ${Math.sin(rad) * 104}px)`,
  };
};

function formato12(hhmm: string): string {
  const partes = hhmm.split(":");
  const h = parseInt(partes[0], 10);
  const m = partes[1] || "00";
  const suf = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suf}`;
}

export default function RelojHora({ valor, onChange }: RelojHoraProps) {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<"hora" | "minuto">("hora");
  const [h12, setH12] = useState(12);
  const [minuto, setMinuto] = useState(0);
  const [pm, setPm] = useState(false);

  const abrir = () => {
    let hh = 0;
    let mm = 0;
    if (valor) {
      const partes = valor.split(":");
      hh = parseInt(partes[0], 10) || 0;
      mm = parseInt(partes[1], 10) || 0;
    } else {
      const n = new Date();
      hh = n.getHours();
      mm = n.getMinutes();
    }
    setH12(hh % 12 === 0 ? 12 : hh % 12);
    setPm(hh >= 12);
    setMinuto(mm);
    setPaso("hora");
    setAbierto(true);
  };

  const aceptar = () => {
    const hh24 = pm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    onChange(`${pad2(hh24)}:${pad2(minuto)}`);
    setAbierto(false);
  };

  const indiceHora = h12 % 12;
  const indiceMin = Math.round(minuto / 5) % 12;
  const angulo = paso === "hora" ? indiceHora * 30 : indiceMin * 30;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none text-left bg-white"
        style={{ color: valor ? "#1f2937" : "#9ca3af" }}
      >
        {valor ? formato12(valor) : "Selecciona una hora"}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar hora de recogida"
            className="bg-[#2f2f2f] rounded-3xl overflow-hidden w-[320px] max-w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#525252] px-6 py-5 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <button
                  type="button"
                  onClick={() => setPaso("hora")}
                  className={`text-5xl font-light leading-none ${
                    paso === "hora" ? "text-white" : "text-[#a0a0a0]"
                  }`}
                >
                  {h12}
                </button>
                <span
                  className={`text-4xl font-light leading-none ${
                    paso === "hora" ? "text-white" : "text-[#a0a0a0]"
                  }`}
                >
                  :
                </span>
                <button
                  type="button"
                  onClick={() => setPaso("minuto")}
                  className={`text-5xl font-light leading-none ${
                    paso === "minuto" ? "text-white" : "text-[#a0a0a0]"
                  }`}
                >
                  {pad2(minuto)}
                </button>
              </div>
              <div className="flex flex-col gap-1 ml-4">
                <button
                  type="button"
                  onClick={() => setPm(false)}
                  className={`text-sm font-bold ${!pm ? "text-white" : "text-[#a0a0a0]"}`}
                >
                  A. M.
                </button>
                <button
                  type="button"
                  onClick={() => setPm(true)}
                  className={`text-sm font-bold ${pm ? "text-white" : "text-[#a0a0a0]"}`}
                >
                  P. M.
                </button>
              </div>
            </div>

            <div className="px-6 pt-5 pb-1">
              <p className="text-center text-xs text-[#9e9e9e] mb-3">
                {paso === "hora" ? "Selecciona la hora" : "Selecciona los minutos"}
              </p>
              <div className="relative mx-auto w-60 h-60 rounded-full bg-[#3c3c3c]">
                <div
                  className="absolute w-[2px] bg-[#3ddc84]"
                  style={{
                    top: "calc(50% - 104px)",
                    left: "calc(50% - 1px)",
                    height: 104,
                    transform: `rotate(${angulo}deg)`,
                    transformOrigin: "50% 100%",
                  }}
                ></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#3ddc84] z-10"></div>
                {(paso === "hora" ? HORAS : MINUTOS).map((n, i) => {
                  const seleccionado =
                    paso === "hora" ? i === indiceHora : i === indiceMin;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        if (paso === "hora") {
                          setH12(n);
                          setPaso("minuto");
                        } else {
                          setMinuto(n);
                        }
                      }}
                      className={`absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full text-[15px] font-bold flex items-center justify-center ${
                        seleccionado
                          ? "bg-[#3ddc84] text-[#1b1b1b]"
                          : "text-[#d6d6d6] hover:bg-white/10"
                      }`}
                      style={posicion(i)}
                    >
                      {paso === "hora" ? n : pad2(n)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 px-5 pt-3 pb-4">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-[#3ddc84] font-medium text-sm px-3 py-2 rounded-full hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aceptar}
                className="text-[#3ddc84] font-bold text-sm px-3 py-2 rounded-full hover:bg-white/10"
              >
                Establecer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
