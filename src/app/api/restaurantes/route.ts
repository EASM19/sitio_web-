import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const RESTAURANT_ID = "restaurante1";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function error(msg: string, status: number) {
  return Response.json({ error: msg }, { status });
}

async function asegurarUsuario(
  auth: Auth,
  email: string,
  password: string | undefined,
  nombre?: string
): Promise<{ uid: string; creado: boolean } | null> {
  try {
    const u = await auth.getUserByEmail(email);
    return { uid: u.uid, creado: false };
  } catch (e) {
    if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
    if (!password || password.length < 6) return null;
    const u = await auth.createUser({
      email,
      password,
      ...(nombre ? { displayName: nombre } : {}),
    });
    return { uid: u.uid, creado: true };
  }
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const accion = typeof body?.accion === "string" ? body.accion : "";
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!accion || !idToken) {
      return error("Solicitud incompleta", 400);
    }

    let app;
    try {
      app = adminApp();
    } catch (e) {
      const codigo = (e as Error).message;
      console.error("restaurantes, config inválida:", codigo);
      return error(
        codigo === "JSON_INVALIDO"
          ? "FIREBASE_SERVICE_ACCOUNT no es JSON válido en el servidor"
          : "El servidor no tiene FIREBASE_SERVICE_ACCOUNT configurado",
        501
      );
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    let decoded: { uid: string };
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return error("Sesión no válida", 401);
    }

    const snapCaller = await db
      .doc(`restaurantes/${RESTAURANT_ID}/usuarios/${decoded.uid}`)
      .get();
    const datosCaller = snapCaller.exists ? snapCaller.data() : null;
    if (!datosCaller || datosCaller.rol !== "superadmin" || datosCaller.activo === false) {
      return error("No autorizado", 403);
    }

    const str = (v: unknown, max = 80) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";

    if (accion === "crear") {
      const nombre = str(body?.nombre);
      const slug = str(body?.slug, 50).toLowerCase();
      const email = str(body?.email, 254).toLowerCase();
      const password = typeof body?.password === "string" ? body.password : undefined;
      const duenoNombre = str(body?.duenoNombre);
      if (nombre.length < 3) return error("El nombre debe tener al menos 3 caracteres", 400);
      if (!SLUG_RE.test(slug)) {
        return error("Slug inválido: usa letras, números y guiones", 400);
      }
      if (email && !email.includes("@")) return error("Correo inválido", 400);

      const col = db.collection("restaurantes");
      const existeDoc = await db.doc(`restaurantes/${slug}`).get();
      if (existeDoc.exists) return error("Ese slug ya está en uso", 409);
      const porSlug = await col.where("slug", "==", slug).limit(1).get();
      if (!porSlug.empty) return error("Ese slug ya está en uso", 409);

      let uidDueno: string | null = null;
      let creadaAuth = false;
      if (email) {
        const cuenta = await asegurarUsuario(auth, email, password, duenoNombre);
        if (!cuenta) {
          return error("Contraseña requerida (mín. 6 caracteres) para cuenta nueva", 400);
        }
        uidDueno = cuenta.uid;
        creadaAuth = cuenta.creado;
      }

      try {
        await db.runTransaction(async (t) => {
          const ref = db.doc(`restaurantes/${slug}`);
          const previa = await t.get(ref);
          if (previa.exists) throw { code: "SLUG_OCUPADO" };
          t.set(ref, {
            nombre,
            slug,
            activo: true,
            duenoUid: uidDueno,
            duenoEmail: email || null,
            creado: FieldValue.serverTimestamp(),
            creadoPor: decoded.uid,
          });
          if (uidDueno && email) {
            t.set(db.doc(`restaurantes/${slug}/usuarios/${uidDueno}`), {
              nombre: duenoNombre,
              email,
              rol: "dueno",
              telefono: "",
              activo: true,
              restaurantId: slug,
              creado: FieldValue.serverTimestamp(),
            });
          }
        });
      } catch (e) {
        if (creadaAuth && uidDueno) {
          try {
            await auth.deleteUser(uidDueno);
          } catch {
            // limpieza best-effort
          }
        }
        if ((e as { code?: string })?.code === "SLUG_OCUPADO") {
          return error("Ese slug ya está en uso", 409);
        }
        throw e;
      }
      return Response.json({ ok: true, rid: slug });
    }

    if (accion === "actualizar") {
      const rid = str(body?.rid, 50);
      const nombre = str(body?.nombre);
      if (!rid || nombre.length < 3) return error("Datos incompletos", 400);
      const ref = db.doc(`restaurantes/${rid}`);
      const snap = await ref.get();
      if (!snap.exists) return error("Restaurante no encontrado", 404);
      await ref.update({ nombre });
      return Response.json({ ok: true });
    }

    if (accion === "toggle") {
      const rid = str(body?.rid, 50);
      if (!rid) return error("Datos incompletos", 400);
      const ref = db.doc(`restaurantes/${rid}`);
      const snap = await ref.get();
      if (!snap.exists) return error("Restaurante no encontrado", 404);
      const activo = snap.data()?.activo === false;
      await ref.update({ activo });
      return Response.json({ ok: true, activo });
    }

    if (accion === "asignar-dueno") {
      const rid = str(body?.rid, 50);
      const email = str(body?.email, 254).toLowerCase();
      const password = typeof body?.password === "string" ? body.password : undefined;
      const nombre = str(body?.nombre);
      if (!rid || !email || !email.includes("@")) return error("Datos incompletos", 400);

      const refRegistro = db.doc(`restaurantes/${rid}`);
      const snapRegistro = await refRegistro.get();
      if (!snapRegistro.exists) return error("Restaurante no encontrado", 404);

      const cuenta = await asegurarUsuario(auth, email, password, nombre);
      if (!cuenta) {
        return error("Contraseña requerida (mín. 6 caracteres) para cuenta nueva", 400);
      }
      const { uid } = cuenta;

      await db.runTransaction(async (t) => {
        const registro = await t.get(refRegistro);
        const anterior = registro.data()?.duenoUid as string | undefined;
        const refMembresia = db.doc(`restaurantes/${rid}/usuarios/${uid}`);
        const snapMembresia = await t.get(refMembresia);

        if (anterior && anterior !== uid) {
          const refAnterior = db.doc(`restaurantes/${rid}/usuarios/${anterior}`);
          const snapAnterior = await t.get(refAnterior);
          if (snapAnterior.exists) {
            t.update(refAnterior, { activo: false });
          }
        }
        t.set(
          refMembresia,
          {
            nombre: nombre || (snapMembresia.exists ? snapMembresia.data()?.nombre : "") || "",
            email,
            rol: "dueno",
            telefono: snapMembresia.exists ? snapMembresia.data()?.telefono || "" : "",
            activo: true,
            restaurantId: rid,
            ...(snapMembresia.exists ? {} : { creado: FieldValue.serverTimestamp() }),
          },
          { merge: true }
        );
        t.update(refRegistro, { duenoUid: uid, duenoEmail: email });
      });
      return Response.json({ ok: true, uid });
    }

    return error("Acción no reconocida", 400);
  } catch (err) {
    console.error("Error en /api/restaurantes:", err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
