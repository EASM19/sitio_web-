import { collection, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

export const RESTAURANTE_DEFECTO = "restaurante1";

/** Imagen y redes propias de cada restaurante. Se guarda de forma opcional en
 * el documento del restaurante; si no existe, se usan los valores históricos
 * de La Bóveda para no alterar `restaurante1`. */
export type ConfiguracionPublica = {
  logo: string;
  hero: string;
  instagram: string;
  facebook: string;
  frase: string;
};

export const CONFIGURACION_PUBLICA_DEFECTO: ConfiguracionPublica = {
  logo: "",
  hero: "/menu/hero.jpg",
  instagram: "https://www.instagram.com/labovedadelreal",
  facebook: "https://www.facebook.com/share/1BzRuv79S6/?mibextid=wwXIfr",
  frase: "Donde la historia y la comida se fusionan.",
};

export function resolverConfiguracionPublica(
  raw: unknown
): ConfiguracionPublica {
  // Sin configuración guardada se conservan exactamente los valores de La
  // Bóveda. Cuando el dueño guarda la suya, un campo vacío significa que no
  // quiere mostrar ese elemento (no se rellena con datos de otro restaurante).
  if (!raw || typeof raw !== "object") {
    return { ...CONFIGURACION_PUBLICA_DEFECTO };
  }
  const c = raw as Partial<ConfiguracionPublica>;
  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    logo: txt(c.logo),
    hero: txt(c.hero),
    instagram: txt(c.instagram),
    facebook: txt(c.facebook),
    frase: txt(c.frase),
  };
}

export type RegistroRestaurante = {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  duenoUid?: string | null;
  duenoEmail?: string | null;
  configuracion?: Partial<ConfiguracionPublica> | null;
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
  data: {
    error?: string;
    rid?: string;
    activo?: boolean;
    uid?: string;
    eliminados?: number;
    cuentasBorradas?: number;
    creado?: boolean;
    reparado?: boolean;
    migrados?: number;
  };
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
