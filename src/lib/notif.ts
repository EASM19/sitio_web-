export function pedirPermisoNotificaciones(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") {
    return Promise.resolve("denied");
  }
  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }
  if (Notification.permission === "denied") {
    return Promise.resolve("denied");
  }
  return Notification.requestPermission();
}

export function notificar(titulo: string, cuerpo: string, url?: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(titulo, { body: cuerpo, data: { url: url || "/" } });
    n.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      n.close();
    };
  } catch {
    // ignorado
  }
}
