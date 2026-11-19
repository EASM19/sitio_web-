import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
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

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");
    process.exit(1);
  }
  await signInWithEmailAndPassword(auth, email, pass);
  console.log("Autenticado como admin");

  const ref = doc(db, "restaurantes", "restaurante1");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    console.log("Registro restaurantes/restaurante1 ya existe:", JSON.stringify(snap.data()));
  } else {
    await setDoc(ref, {
      nombre: "La Bóveda Del Real",
      slug: "la-boveda-del-real",
      activo: true,
      duenoUid: null,
      duenoEmail: null,
      creado: serverTimestamp(),
      creadoPor: "script-registro-inicial",
    });
    console.log("Registro restaurantes/restaurante1 creado");
  }

  const lista = await getDocs(collection(db, "restaurantes"));
  console.log(`Docs en colección restaurantes: ${lista.size}`);
  lista.forEach((d) => console.log(" -", d.id, JSON.stringify(d.data())));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
