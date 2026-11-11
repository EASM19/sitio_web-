import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { RolUsuario, UsuarioRol } from "@/types";

const RESTAURANT_ID = "restaurante1";
const INTENTOS = 3;
const ESPERA_MS = 400;

export function usuarioRolRef(uid: string) {
  return doc(db, "restaurantes", RESTAURANT_ID, "usuarios", uid);
}

export type ResultadoRol =
  | { estado: "ok"; usuario: UsuarioRol | null }
  | { estado: "error"; mensaje: string; codigo: string };

export async function consultarRol(uid: string): Promise<ResultadoRol> {
  let ultimo: unknown = null;
  for (let i = 0; i < INTENTOS; i++) {
    try {
      const snap = await getDoc(usuarioRolRef(uid));
      if (!snap.exists()) return { estado: "ok", usuario: null };
      return { estado: "ok", usuario: { uid, ...snap.data() } as UsuarioRol };
    } catch (e) {
      ultimo = e;
      if (i < INTENTOS - 1) {
        await new Promise((r) => setTimeout(r, ESPERA_MS));
      }
    }
  }
  const codigo = (ultimo as { code?: string })?.code || "desconocido";
  console.error("Error consultando rol de usuario:", codigo, ultimo);
  return {
    estado: "error",
    mensaje:
      "No se pudo verificar tu cuenta (problema de conexión o permisos). Revisa tu conexión y vuelve a intentar.",
    codigo,
  };
}

export async function obtenerUsuarioRol(uid: string): Promise<UsuarioRol | null> {
  const r = await consultarRol(uid);
  return r.estado === "ok" ? r.usuario : null;
}

export async function esRol(uid: string, rol: RolUsuario): Promise<boolean> {
  const u = await obtenerUsuarioRol(uid);
  return u?.rol === rol && u.activo !== false;
}
