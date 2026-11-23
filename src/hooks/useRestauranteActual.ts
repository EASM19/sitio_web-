"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { consultarMembresias } from "@/lib/roles";
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
  const propioRef = useRef<string | null>(null);
  const superRef = useRef(false);
  const resueltoRef = useRef(false);

  useEffect(() => {
    let vivo = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        propioRef.current = null;
        superRef.current = false;
        resueltoRef.current = true;
        setListo(true);
        return;
      }
      const membresias = await consultarMembresias(u.uid);
      if (!vivo) return;
      if (membresias) {
        const superadmin = membresias.find(
          (m) => m.rol === "superadmin" && m.activo !== false
        );
        const dueno = membresias.find(
          (m) => m.rol === "dueno" && m.activo !== false
        );
        const repartidor = membresias.find(
          (m) => m.rol === "repartidor" && m.activo !== false
        );
        superRef.current = Boolean(superadmin);
        propioRef.current = dueno?.rid || repartidor?.rid || null;
        if (!superadmin && propioRef.current) {
          setRid(propioRef.current);
          fijarRestaurante(propioRef.current);
        }
      }
      resueltoRef.current = true;
      setListo(true);
    });
    return () => {
      vivo = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      let elegido = RESTAURANTE_DEFECTO;
      try {
        const param = new URLSearchParams(window.location.search).get("r");
        const guardado = localStorage.getItem(CLAVE);
        if (propioRef.current) {
          elegido = propioRef.current;
        } else if (param && /^[a-z0-9-]{1,50}$/i.test(param)) {
          elegido = param;
          localStorage.setItem(CLAVE, param);
        } else if (guardado && /^[a-z0-9-]{1,50}$/i.test(guardado)) {
          elegido = guardado;
        }
      } catch {
        elegido = propioRef.current || RESTAURANTE_DEFECTO;
      }
      setRid(elegido);
      if (resueltoRef.current) setListo(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const alCambiar = (e: Event) => {
      const valor = (e as CustomEvent<string>).detail;
      if (!valor || !/^[a-z0-9-]{1,50}$/i.test(valor)) return;
      if (!superRef.current && propioRef.current && valor !== propioRef.current) {
        setRid(propioRef.current);
        return;
      }
      setRid(valor);
    };
    window.addEventListener(EVENTO, alCambiar);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, []);

  return { rid, listo };
}
