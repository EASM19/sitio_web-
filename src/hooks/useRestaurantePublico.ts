"use client";

import { useEffect, useState } from "react";
import {
  collection, doc, getDoc, getDocs, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RegistroRestaurante } from "@/lib/restaurantes";
import { RESTAURANTE_DEFECTO } from "@/lib/restaurantes";

export type RestaurantePublico = {
  rid: string;
  slug: string;
  nombre: string;
  disponible: boolean;
  listo: boolean;
};

const NOMBRE_DEFECTO = "La Bóveda Del Real";
const MATCH_PARAM = /^[a-z0-9-]{1,50}$/i;

export function useRestaurantePublico(): RestaurantePublico {
  const [rid, setRid] = useState(RESTAURANTE_DEFECTO);
  const [slug, setSlug] = useState("");
  const [nombre, setNombre] = useState(NOMBRE_DEFECTO);
  const [disponible, setDisponible] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      try {
        const param = new URLSearchParams(window.location.search).get("r");
        if (param && MATCH_PARAM.test(param)) {
          // 1) Documento con id == parámetro (los restaurantes nuevos usan id == slug)
          const regId = await getDoc(doc(db, "restaurantes", param));
          if (regId.exists()) {
            const reg = regId.data() as RegistroRestaurante;
            setRid(param);
            setSlug(reg.slug);
            setNombre(reg.nombre || NOMBRE_DEFECTO);
            setDisponible(reg.activo !== false);
            setListo(true);
            return;
          }
          // 2) Buscar el restaurante por su slug
          const q = query(collection(db, "restaurantes"), where("slug", "==", param));
          const snap = await getDocs(q);
          const r = snap.docs[0];
          if (r) {
            const reg = r.data() as RegistroRestaurante;
            setRid(r.id);
            setSlug(reg.slug || param);
            setNombre(reg.nombre || NOMBRE_DEFECTO);
            setDisponible(reg.activo !== false);
            setListo(true);
            return;
          }
          // 3) No existe el restaurante
          setDisponible(false);
          setListo(true);
          return;
        }
        // Default: restaurante afecto, leemos su registro para el nombre
        setRid(RESTAURANTE_DEFECTO);
        const snap = await getDoc(doc(db, "restaurantes", RESTAURANTE_DEFECTO));
        const reg = snap.exists() ? (snap.data() as RegistroRestaurante) : null;
        setSlug(reg?.slug || "");
        setNombre(reg?.nombre || NOMBRE_DEFECTO);
        setDisponible(reg?.activo !== false);
        setListo(true);
      } catch {
        // Fallback so pena luz: mostrar el restaurante por defecto de modo optimista
        setRid(RESTAURANTE_DEFECTO);
        setNombre(NOMBRE_DEFECTO);
        setDisponible(true);
        setListo(true);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return { rid, slug, nombre, disponible, listo };
}
