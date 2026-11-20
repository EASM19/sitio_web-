// Prepara el escenario: superadmin temporal + restaurante con dueño.
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const sa = JSON.parse(
  readFileSync(
    "C:/Users/Eduardo/Downloads/shopqr-72033-firebase-adminsdk-fbsvc-04f7d66115.json",
    "utf8"
  )
);
const app = initializeApp({ credential: cert(sa) });
const auth = getAuth(app);
const db = getFirestore(app);
const KEY = "AIzaSyC0Qt4yNGzoGGM_gSxppGO7CCOej_zrjzg";
const BASE = "https://sitio-web-eight-khaki.vercel.app";

const suf = Date.now().toString(36);
const pass = "Temp123456";
const emailSuper = `diagsuper.dueno.${suf}@example.com`;
const emailDueno = `dueno.prueba.${suf}@example.com`;
const slug = `prueba-dueno-${suf}`;

async function j(url, opts) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(60000) });
  const t = await r.text();
  let data;
  try {
    data = JSON.parse(t);
  } catch {
    data = t;
  }
  return { status: r.status, data };
}

const superAuth = await auth.createUser({
  uid: `superdueno${suf}`,
  email: emailSuper,
  password: pass,
  displayName: "Super Dueno Diag",
});
await db.doc(`restaurantes/restaurante1/usuarios/${superAuth.uid}`).set({
  nombre: "Super Dueno Diag",
  email: emailSuper,
  rol: "superadmin",
  activo: true,
  creado: new Date(),
});

const login = await j(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: emailSuper, password: pass, returnSecureToken: true }),
  }
);
const H = { "content-type": "application/json", authorization: `Bearer ${login.data.idToken}` };

const crear = await j(`${BASE}/api/restaurantes`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    accion: "crear",
    nombre: "Prueba Dueno Panel",
    slug,
    email: emailDueno,
    password: pass,
    duenoNombre: "Dueno Prueba",
  }),
});
console.log("crear restaurante:", crear.status, JSON.stringify(crear.data));

const dueno = await auth.getUserByEmail(emailDueno).catch((e) => e.code);
console.log(
  "cuenta dueño:",
  typeof dueno === "string" ? dueno : `uid=${dueno.uid}`,
  "| rol en su restaurante:",
  (await db.doc(`restaurantes/${slug}/usuarios/${dueno.uid}`).get()).data()?.rol
);

console.log(
  "CREDENCIALES:",
  JSON.stringify({ emailSuper, emailDueno, pass, slug, uidSuper: superAuth.uid })
);
