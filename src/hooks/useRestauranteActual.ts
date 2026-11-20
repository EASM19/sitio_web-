"use client";

import { useEffect, useState } from "react";
import { RESTAURANTE_DEFECTO } from "@/lib/restaurantes";

const CLAVE = "restauranteActual";
const EVENTO = "restauranteActualCambiado";

export function fijarRestaurante(rid: string) {
  try {
    localStorage.setItem(CLAVE, rid);
  } catch {
    // almacenamiento no disponible
  }
  try {
    window.dispatchEvent(new CustomEvent<string>(EVENTO, { detail: rid }));
  } catch {
    // entorno sin window
  }
}

export function restauranteGuardado(): string | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v && /^[a-z0-9-]{1,50}$/i.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function useRestauranteActual(): { rid: string; listo: boolean } {
  const [rid, setRid] = useState(RESTAURANTE_DEFECTO);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      let elegido = RESTAURANTE_DEFECTO;
      try {
        const param = new URLSearchParams(window.location.search).get("r");
        const guardado = localStorage.getItem(CLAVE);
        if (param && /^[a-z0-9-]{1,50}$/i.test(param)) {
          elegido = param;
          localStorage.setItem(CLAVE, param);
        } else if (guardado && /^[a-z0-9-]{1,50}$/i.test(guardado)) {
          elegido = guardado;
        }
      } catch {
        elegido = RESTAURANTE_DEFECTO;
      }
      setRid(elegido);
      setListo(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const alCambiar = (e: Event) => {
      const valor = (e as CustomEvent<string>).detail;
      if (valor && /^[a-z0-9-]{1,50}$/i.test(valor)) setRid(valor);
    };
    window.addEventListener(EVENTO, alCambiar);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, []);

  return { rid, listo };
}
