// Despliega firestore.rules como un nuevo ruleset y activa el release del proyecto.
// Usa la service account del Downloads. Uso: node scripts/desplegar-reglas.mjs [ruta-sa.json]
import { readFileSync, existsSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const proyecto = "shopqr-72033";
const candidates = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  join(homedir(), "Downloads", "shopqr-72033-firebase-adminsdk-fbsvc-04f7d66115.json"),
].filter(Boolean);
const rutaSa = candidates.find((p) => existsSync(p));
if (!rutaSa) {
  console.error("Service account no encontrada. Pásalen como argumento.");
  process.exit(1);
}
const sa = JSON.parse(readFileSync(rutaSa, "utf8"));

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ahora = Math.floor(Date.now() / 1000);
const header = b64url(
  JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id })
);
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

const t = await (
  await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(jwt)}`,
  })
).json();
if (!t.access_token) {
  console.error("Error de token:", JSON.stringify(t));
  process.exit(1);
}
const H = {
  authorization: `Bearer ${t.access_token}`,
  "content-type": "application/json",
};
const base = "https://firebaserules.googleapis.com/v1";
const api = `${base}/projects/${proyecto}`;

async function getJson(url, method = "GET", body) {
  const r = await fetch(url, { method, headers: H, body });
  const txt = await r.text();
  if (!r.ok) {
    console.error(method, url, r.status, txt.slice(0, 500));
    process.exit(1);
  }
  return txt ? JSON.parse(txt) : null;
}

const releases = await getJson(`${api}/releases`);
console.log(
  "releases:",
  (releases.releases || []).map((x) => x.name).join(", ") || "(ninguno)"
);

const rules = readFileSync("firestore.rules", "utf8");
const rs = await getJson(
  `${api}/rulesets`,
  "POST",
  JSON.stringify({
    source: { files: [{ name: "firestore.rules", content: rules }] },
  })
);
console.log("nuevo ruleset:", rs.name, "| createTime:", rs.createTime);

const relName =
  (releases.releases?.[0]?.name) || `projects/${proyecto}/releases/cloud.firestore`;
const rel = await getJson(
  `${base}/${relName}`,
  "PATCH",
  JSON.stringify({
    release: { name: relName, rulesetName: rs.name },
    updateMask: "ruleset_name",
  })
);
console.log("release actualizado:", rel.name, "→ rulesetName:", rel.rulesetName);
