import {
  collection, addDoc, getDocs, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const RESTAURANT_ID = "restaurante1";

type PushSub = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function suscribirsePush(tipo: "admin" | "cliente", uid: string) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return;

    const registro = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    const suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const col = collection(db, "restaurantes", RESTAURANT_ID, "push");
    const snap = await getDocs(query(col, where("uid", "==", uid)));
    const existente = snap.docs.find(
      (d) =>
        (d.data().subscription as PushSub)?.endpoint ===
        suscripcion.toJSON().endpoint
    );
    if (!existente) {
      await addDoc(col, {
        tipo,
        uid,
        subscription: suscripcion.toJSON(),
        creado: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Error suscribiendo a push:", err);
  }
}

export async function obtenerSuscripciones(filtro: { tipo?: string; uid?: string }) {
  try {
    const snap = await getDocs(collection(db, "restaurantes", RESTAURANT_ID, "push"));
    return snap.docs
      .map((d) => d.data() as { tipo: string; uid: string; subscription: PushSub })
      .filter((d) => {
        if (filtro.tipo && d.tipo !== filtro.tipo) return false;
        if (filtro.uid && d.uid !== filtro.uid) return false;
        return true;
      })
      .map((d) => d.subscription);
  } catch (err) {
    console.error("Error obteniendo suscripciones:", err);
    return [];
  }
}

export async function enviarNotificacionPush(
  titulo: string,
  cuerpo: string,
  url: string,
  suscripciones: unknown[]
) {
  if (!suscripciones.length) return;
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, cuerpo, url, suscripciones }),
    });
  } catch (err) {
    console.error("Error enviando notificación:", err);
  }
}
