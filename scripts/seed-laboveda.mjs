import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc,
} from "firebase/firestore";
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

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");
    process.exit(1);
  }
  await signInWithEmailAndPassword(auth, email, pass);
  console.log("Autenticado como admin");

  const base = (segmento) => collection(db, "restaurantes", RESTAURANT_ID, segmento);

  const pedidosSnap = await getDocs(base("pedidos"));
  for (const d of pedidosSnap.docs) {
    const msgs = await getDocs(collection(db, "restaurantes", RESTAURANT_ID, "pedidos", d.id, "mensajes"));
    for (const m of msgs.docs) await deleteDoc(m.ref);
    await deleteDoc(d.ref);
  }
  console.log(`Ventas/pedidos borrados: ${pedidosSnap.size}`);

  const prodsSnap = await getDocs(base("productos"));
  for (const d of prodsSnap.docs) await deleteDoc(d.ref);
  console.log(`Productos viejos borrados: ${prodsSnap.size}`);

  const catsSnap = await getDocs(base("categorias"));
  for (const d of catsSnap.docs) await deleteDoc(d.ref);
  console.log(`Categorías viejas borradas: ${catsSnap.size}`);

  const catRef = base("categorias");
  const catIds = {};
  for (const cat of menu.categorias) {
    const nueva = await addDoc(catRef, {
      restaurantId: RESTAURANT_ID,
      nombre: cat.nombre,
      orden: cat.orden,
      estado: "activa",
    });
    catIds[cat.nombre] = nueva.id;
    console.log("Categoría:", cat.nombre);
  }

  const prodRef = base("productos");
  let agregados = 0;
  for (const p of menu.productos) {
    await addDoc(prodRef, {
      restaurantId: RESTAURANT_ID,
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      precio: p.precio,
      ingredientes: p.ingredientes || "",
      imagen: p.imagen || "",
      categoriaId: catIds[p.categoria] || "",
      disponible: true,
      estado: "activo",
    });
    agregados++;
  }
  console.log(`Listo: ${menu.categorias.length} categorías y ${agregados} productos del menú de La Bóveda.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
