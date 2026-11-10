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
const map = JSON.parse(readFileSync(join(aqui, "product-image-map.json"), "utf8"));
const byName = new Map(map.map((m) => [m.nombre, m.imagen]));

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
  let noEncontrados = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const nombre = data.nombre;
    const nuevaImagen = byName.get(nombre);
    if (!nuevaImagen) {
      console.log("Sin mapeo:", nombre);
      noEncontrados++;
      continue;
    }
    if (data.imagen === nuevaImagen) continue;
    await updateDoc(doc(db, "restaurantes", RESTAURANT_ID, "productos", d.id), {
      imagen: nuevaImagen,
    });
    actualizados++;
  }
  console.log(`Firestore actualizados: ${actualizados}, sin mapeo: ${noEncontrados}, total docs: ${snap.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
