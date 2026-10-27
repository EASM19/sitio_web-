import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, doc, deleteDoc,
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

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");
    process.exit(1);
  }
  await signInWithEmailAndPassword(auth, email, pass);
  console.log("Autenticado como admin");

  const pedidosSnap = await getDocs(
    collection(db, "restaurantes", RESTAURANT_ID, "pedidos")
  );
  console.log(`Pedidos encontrados: ${pedidosSnap.size}`);

  let borrados = 0;
  let mensajes = 0;
  for (const d of pedidosSnap.docs) {
    const msgsSnap = await getDocs(
      collection(db, "restaurantes", RESTAURANT_ID, "pedidos", d.id, "mensajes")
    );
    for (const m of msgsSnap.docs) {
      await deleteDoc(m.ref);
      mensajes++;
    }
    await deleteDoc(d.ref);
    borrados++;
  }
  console.log(`Listo: ${borrados} pedidos eliminados, ${mensajes} mensajes eliminados.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
