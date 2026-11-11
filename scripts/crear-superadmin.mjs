import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0Qt4yNGzoGGM_gSxppGO7CCOej_zrjzg",
  authDomain: "shopqr-72033.firebaseapp.com",
  projectId: "shopqr-72033",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SUPER_EMAIL = process.env.SUPERADMIN_EMAIL || "superadmin@laboveda.com";
const SUPER_PASS = process.env.SUPERADMIN_PASSWORD || "Boveda2026!";
const SUPER_NOMBRE = process.env.SUPERADMIN_NOMBRE || "Super Admin";

async function escribirDoc(uid) {
  await setDoc(
    doc(db, "restaurantes", "restaurante1", "usuarios", uid),
    {
      nombre: SUPER_NOMBRE,
      email: SUPER_EMAIL,
      rol: "superadmin",
      telefono: "",
      activo: true,
      creado: serverTimestamp(),
    },
    { merge: true }
  );
  const check = await getDoc(doc(db, "restaurantes", "restaurante1", "usuarios", uid));
  console.log("READ-back:", check.exists() ? "doc visible" : "doc NO visible");
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPass = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPass) {
  console.error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD");
  process.exit(1);
}

try {
  await signInWithEmailAndPassword(auth, adminEmail, adminPass);
  console.log("OK sign-in admin");
} catch (e) {
  console.log("FAIL sign-in admin:", e.code, e.message);
  process.exit(1);
}

try {
  const cred = await createUserWithEmailAndPassword(auth, SUPER_EMAIL, SUPER_PASS);
  console.log("OK create superadmin:", cred.user.uid);
  await updateProfile(cred.user, { displayName: SUPER_NOMBRE });
  await escribirDoc(cred.user.uid);
  console.log("OK usuarios doc escrita");
} catch (e) {
  if (e.code === "auth/email-already-in-use") {
    console.log("Superadmin ya existe, asegurando doc...");
    try {
      const cred = await signInWithEmailAndPassword(auth, SUPER_EMAIL, SUPER_PASS);
      await escribirDoc(cred.user.uid);
      console.log("OK usuarios doc asegurada para:", cred.user.uid);
    } catch (e2) {
      console.log("FAIL:", e2.code, e2.message);
      process.exit(1);
    }
  } else {
    console.log("FAIL create:", e.code, e.message);
    process.exit(1);
  }
}

console.log("LISTO ->", SUPER_EMAIL);
