self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { cuerpo: event.data ? event.data.text() : "" };
  }
  const titulo = data.titulo || "ShopQR";
  const opciones = {
    body: data.cuerpo || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    sound: "default",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((lista) => {
        for (const cliente of lista) {
          if ("focus" in cliente) return cliente.focus();
        }
        return self.clients.openWindow(destino);
      })
  );
});
