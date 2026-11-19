import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs } from "firebase/firestore";
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

async function walk(uid) {
  const regs = await getDocs(collection(db, "restaurantes"));
  const hits = [];
  for (const r of regs.docs) {
    const m = await getDoc(doc(db, "restaurantes", r.id, "usuarios", uid));
    if (m.exists()) hits.push({ rid: r.id, ...m.data() });
  }
  return { totalRestaurantes: regs.size, hits };
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");
    process.exit(1);
  }
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  console.log("Autenticado, uid:", cred.user.uid);

  try {
    const res = await walk(cred.user.uid);
    console.log("Walk admin OK ->", JSON.stringify(res, null, 2));
  } catch (e) {
    console.log("Walk admin FALLÓ ->", e.code || e.message);
  }

  try {
    const res2 = await walk("mTRp7xR42wgZIYy6E1ifLySvQpY2");
    console.log("Walk superadmin usuario OK ->", JSON.stringify(res2, null, 2));
  } catch (e) {
    console.log("Walk superadmin FALLÓ ->", e.code || e.message);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
