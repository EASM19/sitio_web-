// Descarga las reglas de Firestore actuales usando la service account local
// y las guarda en firestore.rules (versionado en el repo).
// Uso: node scripts/obtener-reglas.mjs [ruta-service-account.json]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const candidatas = [
  process.argv[2],
  join(homedir(), "Downloads", "shopqr-72033-firebase-adminsdk-fbsvc-04f7d66115.json"),
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
].filter(Boolean);

const ruta = candidatas.find((p) => existsSync(p));
if (!ruta) {
  console.error("No se encontró la service account. Pasa la ruta como argumento.");
  process.exit(1);
}

const sa = JSON.parse(readFileSync(ruta, "utf8"));
const ahora = Math.floor(Date.now() / 1000);
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id }));
const claims = b64url(
  JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  })
);
const datos = `${header}.${claims}`;
const firma = b64url(sign("sha256", Buffer.from(datos), createPrivateKey(sa.private_key)));
const jwt = `${datos}.${firma}`;

const resTok = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(jwt)}`,
});
if (!resTok.ok) {
  console.error("Error obteniendo token:", await resTok.text());
  process.exit(1);
}
const { access_token } = await resTok.json();

const cabecera = { authorization: `Bearer ${access_token}` };
const base = "https://firebaserules.googleapis.com/v1/projects/shopqr-72033";

async function getJson(url) {
  const r = await fetch(url, { headers: cabecera });
  if (!r.ok) throw new Error(`${r.status} ${url}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// 1) Buscar el release activo y su ruleset
let contenido = null;
let origen = "";
try {
  const rel = await getJson(`${base}/releases`);
  const release = (rel.releases || []).find((x) => x.rulesetName) || rel.releases?.[0];
  if (release?.rulesetName) {
    const rs = await getJson(
      `https://firebaserules.googleapis.com/v1/${release.rulesetName}`
    );
    contenido = rs.source?.files?.find((f) => f.language === "FIRESTORE_RULES_LANGUAGE_V1")?.content
      || rs.source?.files?.[0]?.content;
    origen = `release ${release.name || ""} → ruleset ${release.rulesetName}`;
  }
} catch (e) {
  console.warn("releases:", e.message);
}
// 2) Fallback: el ruleset más reciente
if (!contenido) {
  try {
    const lista = await getJson(`${base}/rulesets?pageSize=5`);
    const rs = (lista.rulesets || [])[0];
    if (rs) {
      const det = await getJson(`https://firebaserules.googleapis.com/v1/${rs.name}`);
      contenido = det.source?.files?.find((f) => f.language === "FIRESTORE_RULES_LANGUAGE_V1")?.content
        || det.source?.files?.[0]?.content;
      origen = `ruleset ${rs.name}`;
    }
  } catch (e) {
    console.error("rulesets:", e.message);
  }
}
if (!contenido) {
  console.error("No se pudieron leer las reglas.");
  process.exit(1);
}
writeFileSync(
  "firestore.rules",
  contenido.endsWith("\n") ? contenido : contenido + "\n",
  "utf8"
);
console.log(`Reglas guardadas en firestore.rules (${origen})`);
