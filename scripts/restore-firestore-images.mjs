import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0Qt4yNGzoGGM_gSxppGO7CCOej_zrjzg",
  authDomain: "shopqr-72033.firebaseapp.com",
  projectId: "shopqr-72033",
  storageBucket: "shopqr-72033.firebasestorage.app",
  messagingSenderId: "",
  appId: "",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const RESTAURANT_ID = "restaurante1";

const aqui = dirname(fileURLToPath(import.meta.url));
const menu = JSON.parse(readFileSync(join(aqui, "..", "src", "lib", "menu-nuevo.json"), "utf8"));

const byName = new Map();
for (const p of menu.productos) {
  if (byName.has(p.nombre) && byName.get(p.nombre) !== p.imagen) {
    console.log("Duplicado con imagen distinta:", p.nombre);
  }
  byName.set(p.nombre, p.imagen);
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");
    process.exit(1);
  }
  await signInWithEmailAndPassword(auth, email, pass);
  console.log("Autenticado como admin");

  const snap = await getDocs(collection(db, "restaurantes", RESTAURANT_ID, "productos"));
  let actualizados = 0;
  let yaCorrectos = 0;
  let sinMapeo = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const vieja = byName.get(data.nombre);
    if (!vieja) {
      console.log("Sin mapeo:", data.nombre);
      sinMapeo++;
      continue;
    }
    if (data.imagen === vieja) {
      yaCorrectos++;
      continue;
    }
    await updateDoc(doc(db, "restaurantes", RESTAURANT_ID, "productos", d.id), {
      imagen: vieja,
    });
    actualizados++;
  }
  console.log(
    `Restaurados: ${actualizados}, ya correctos: ${yaCorrectos}, sin mapeo: ${sinMapeo}, total docs: ${snap.size}`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
