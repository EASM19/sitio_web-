// Verifica: (1) release activo y su ruleset; (2) reglas compiladas del ruleset activo;
// (3) probes de reglas sin auth: read registry, query por slug, list push,
// (4) probe: read clientes (esperado: denegado).
import { readFileSync, existsSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const proyecto = "shopqr-72033";
const sa = JSON.parse(
  readFileSync(
    [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      join(homedir(), "Downloads", "shopqr-72033-firebase-adminsdk-fbsvc-04f7d66115.json"),
    ].find((p) => p && existsSync(p)),
    "utf8"
  )
);
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ahora = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id }));
const claims = b64url(
  JSON.stringify({
    iss: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: ahora,
    exp: ahora + 3600,
  })
);
const data = `${header}.${claims}`;
const jwt = `${data}.${b64url(sign("sha256", Buffer.from(data), createPrivateKey(sa.private_key)))}`;
const tok = await (
  await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(jwt)}`,
  })
).json();
const H = { headers: { authorization: `Bearer ${tok.access_token}` } };

const api = `https://firebaserules.googleapis.com/v1/projects/${proyecto}`;
const relRaw = await (await fetch(`${api}/releases`, H)).text();
console.log("0) GET releases:", relRaw.slice(0, 300));
const rel = JSON.parse(relRaw);
const release = (rel.releases || [])[0];
console.log("1) release activo:", release?.name);
if (!release) process.exit(1);
let contenido = "";
try {
  const rs = await (await fetch(`${api}/${release.rulesetName}`, H)).json();
  contenido = rs.source?.files?.[0]?.content || "";
  console.log("2) ruleset recuperado:", contenido.split("\n").length, "lineas");
} catch (e) {
  console.log("2) ruleset GET no disponible:", e.message);
}
if (contenido) console.log("2a) primeras líneas:", contenido.split("\n").slice(0, 6));

// Probes sin auth (REST con API key, sin bearer)
const key = process.env.API_KEY || "AIzaSyC0Qt4yNGzoGGM_gSxppGO7CCOej_zrjzg";
const db = `https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents`;
const probe = async (label, url, method, body) => {
  const r = await fetch(url, { method, body });
  const txt = (await r.text()).slice(0, 220).replace(/\s+/g, " ");
  console.log(`${label}: HTTP ${r.status} | ${txt}`);
};
await probe("3a) registry GET unauth", `${db}/restaurantes/restaurante1?key=${key}`);
const qbody = JSON.stringify({
  structuredQuery: {
    from: [{ collectionId: "restaurantes" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "slug" },
        op: "EQUAL",
        value: { stringValue: "la-boveda-del-real" },
      },
    },
    limit: 1,
  },
});
await probe("3b) slug query unauth", `${db}:runQuery?key=${key}`, "POST", qbody);
await probe("3c) categorias GET unauth", `${db}/restaurantes/restaurante1/categorias?pageSize=1&key=${key}`);
await probe("3d) push GET unauth", `${db}/restaurantes/restaurante1/push?key=${key}`);
await probe("4) clientes GET unauth (esperado: denegado)", `${db}/restaurantes/restaurante1/clientes/DummyUid123?key=${key}`);
await probe("5) usuarios GET unauth (esperado: denegado)", `${db}/restaurantes/restaurante1/usuarios/CoMuKqKFiPctuAUDsFVuCXiYy373?key=${key}`);
