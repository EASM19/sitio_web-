import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const RESTAURANT_ID = "restaurante1";

function adminApp() {
  const existente = getApps()[0];
  if (existente) return existente;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("SIN_CONFIG");
  let json: Record<string, string>;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("JSON_INVALIDO");
  }
  const projectId = json.project_id || json.projectId;
  const clientEmail = json.client_email || json.clientEmail;
  const privateKey = json.private_key || json.privateKey;
  if (!projectId || !clientEmail || !privateKey) throw new Error("JSON_INVALIDO");
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export async function POST(req: Request) {
  try {
    let body: { uid?: string } | null = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const uidObjetivo = body?.uid;
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!uidObjetivo || !idToken) {
      return Response.json({ error: "Solicitud incompleta" }, { status: 400 });
    }

    let app;
    try {
      app = adminApp();
    } catch (e) {
      const codigo = (e as Error).message;
      console.error("eliminar-usuario, config inválida:", codigo);
      return Response.json(
        {
          error:
            codigo === "JSON_INVALIDO"
              ? "FIREBASE_SERVICE_ACCOUNT no es JSON válido en el servidor"
              : "El servidor no tiene FIREBASE_SERVICE_ACCOUNT configurado",
        },
        { status: 501 }
      );
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    let decoded: { uid: string };
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return Response.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const refCaller = db.doc(`restaurantes/${RESTAURANT_ID}/usuarios/${decoded.uid}`);
    const snapCaller = await refCaller.get();
    const datosCaller = snapCaller.exists ? snapCaller.data() : null;
    if (!datosCaller || datosCaller.rol !== "superadmin" || datosCaller.activo === false) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    if (uidObjetivo === decoded.uid) {
      return Response.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    const refObjetivo = db.doc(`restaurantes/${RESTAURANT_ID}/usuarios/${uidObjetivo}`);
    const snapObjetivo = await refObjetivo.get();
    if (!snapObjetivo.exists) {
      return Response.json({ error: "La cuenta no existe" }, { status: 404 });
    }
    const rolObjetivo = snapObjetivo.data()?.rol;
    if (rolObjetivo !== "repartidor" && rolObjetivo !== "dueno") {
      return Response.json(
        { error: "Solo se pueden eliminar cuentas de repartidor o dueño" },
        { status: 403 }
      );
    }

    try {
      await auth.deleteUser(uidObjetivo);
    } catch (e) {
      const codigo = (e as { code?: string }).code;
      if (codigo !== "auth/user-not-found") {
        console.error("deleteUser falló:", e);
        return Response.json(
          { error: "No se pudo eliminar la cuenta de Firebase" },
          { status: 500 }
        );
      }
    }

    await refObjetivo.delete();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/eliminar-usuario:", err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
