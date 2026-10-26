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
    tag: data.url || "shopqr",
    renotify: true,
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
        const existente = lista.find((c) => "focus" in c);
        if (existente) {
          return existente.focus().then((c) => {
            if (c && "navigate" in c && c.url.startsWith(self.location.origin)) {
              return c.navigate(destino).then((n) => n || undefined);
            }
            return self.clients.openWindow(destino);
          });
        }
        return self.clients.openWindow(destino);
      })
  );
});
