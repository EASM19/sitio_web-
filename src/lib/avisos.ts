import type { EstadoPedido, TipoPedido } from "@/types";

export function avisoEstado(estado: string, tipo?: TipoPedido): string {
  const esDomicilio = tipo === "DOMICILIO";
  switch (estado) {
    case "RECIBIDO": return "Tu pedido fue recibido por el restaurante 🧾";
    case "PREPARANDO": return "Tu pedido ya está en preparación 👨‍🍳";
    case "LISTO":
      return esDomicilio
        ? "Tu pedido está listo, esperando repartidor 🛵"
        : "Tu pedido está listo para recoger 🎉";
    case "EN_CAMINO": return "Tu pedido va en camino 🚗";
    case "ENTREGADO": return "Tu pedido fue entregado. ¡Gracias! ✅";
    default: return `Estado actualizado: ${estado}`;
  }
}

export function flujoAdmin(tipo?: TipoPedido): EstadoPedido[] {
  return tipo === "DOMICILIO"
    ? ["RECIBIDO", "PREPARANDO", "LISTO"]
    : ["RECIBIDO", "PREPARANDO", "LISTO", "ENTREGADO"];
}

export function siguienteEstadoAdmin(
  tipo: TipoPedido | undefined,
  estado: EstadoPedido | string
): EstadoPedido | null {
  const flujo = flujoAdmin(tipo);
  const idx = flujo.indexOf(estado as EstadoPedido);
  return idx >= 0 && idx < flujo.length - 1 ? flujo[idx + 1] : null;
}

export function progresoPedido(estado: string, tipo?: TipoPedido): string {
  if (tipo === "DOMICILIO") {
    switch (estado) {
      case "RECIBIDO": return "20%";
      case "PREPARANDO": return "40%";
      case "LISTO": return "60%";
      case "EN_CAMINO": return "80%";
      default: return "100%";
    }
  }
  switch (estado) {
    case "RECIBIDO": return "25%";
    case "PREPARANDO": return "50%";
    case "LISTO": return "75%";
    default: return "100%";
  }
}

export function etiquetasProgreso(tipo?: TipoPedido): string[] {
  return tipo === "DOMICILIO"
    ? ["Recibido", "Preparando", "Listo", "En camino", "Entregado"]
    : ["Recibido", "Preparando", "Listo", "Entregado"];
}
