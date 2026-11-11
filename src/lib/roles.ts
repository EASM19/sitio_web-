import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { RolUsuario, UsuarioRol } from "@/types";

const RESTAURANT_ID = "restaurante1";

export function usuarioRolRef(uid: string) {
  return doc(db, "restaurantes", RESTAURANT_ID, "usuarios", uid);
}

export async function obtenerUsuarioRol(uid: string): Promise<UsuarioRol | null> {
  try {
    const snap = await getDoc(usuarioRolRef(uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UsuarioRol;
  } catch {
    return null;
  }
}

export async function esRol(uid: string, rol: RolUsuario): Promise<boolean> {
  const u = await obtenerUsuarioRol(uid);
  return u?.rol === rol && u.activo !== false;
}
