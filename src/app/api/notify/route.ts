import webpush from "web-push";

const VAPID_SUBJECT = "mailto:482300579@alumnos.utzac.edu.mx";

export async function POST(req: Request) {
  try {
    const { titulo, cuerpo, url, suscripciones } = (await req.json()) as {
      titulo?: string;
      cuerpo?: string;
      url?: string;
      suscripciones?: unknown[];
    };

    if (!titulo || !Array.isArray(suscripciones) || suscripciones.length === 0) {
      return Response.json({ ok: false, enviados: 0 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return Response.json({ ok: false, error: "Faltan llaves VAPID" });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);

    const payload = JSON.stringify({
      titulo,
      cuerpo: cuerpo || "",
      url: url || "/",
    });

    const resultados = await Promise.allSettled(
      suscripciones.map((s) => webpush.sendNotification(s as webpush.PushSubscription, payload))
    );

    const enviados = resultados.filter((r) => r.status === "fulfilled").length;
    return Response.json({ ok: true, enviados });
  } catch (err) {
    console.error("Error en /api/notify:", err);
    return Response.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
