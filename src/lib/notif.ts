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
