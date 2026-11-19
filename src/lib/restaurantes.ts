import { collection, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

export const RESTAURANTE_DEFECTO = "restaurante1";

export type RegistroRestaurante = {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  duenoUid?: string | null;
  duenoEmail?: string | null;
};

export function generarSlug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export function escucharRestaurantes(
  cb: (regs: RegistroRestaurante[]) => void
): () => void {
  return onSnapshot(
    collection(db, "restaurantes"),
    (snap) => {
      const regs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as RegistroRestaurante
      );
      regs.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      cb(regs);
    },
    (e) => console.error("Error escuchando restaurantes:", e)
  );
}

export type ResultadoApi = {
  ok: boolean;
  status: number;
  data: { error?: string; rid?: string; activo?: boolean; uid?: string };
};

export async function pedirAccionRestaurante(
  user: User,
  body: Record<string, unknown>
): Promise<ResultadoApi> {
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/restaurantes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ResultadoApi["data"];
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Error de conexión. Intenta de nuevo." } };
  }
}
