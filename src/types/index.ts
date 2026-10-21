export interface Restaurante {
  id: string;
  nombre: string;
  logo: string;
  direccion: string;
  telefono: string;
  estado: "activo" | "inactivo";
}

export interface Categoria {
  id: string;
  restaurantId: string;
  nombre: string;
  orden: number;
  estado: "activa" | "inactiva";
}

export interface Producto {
  id: string;
  restaurantId: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  precio: number;
  ingredientes: string;
  imagen: string;
  disponible: boolean;
  estado: "activo" | "inactivo";
}

export interface Mesa {
  id: string;
  restaurantId: string;
  numero: string;
  codigoQR: string;
  estado: "activa" | "inactiva";
}

export type TipoPedido = "MESA" | "PARA_LLEVAR" | "DOMICILIO";
export type EstadoPedido = "RECIBIDO" | "PREPARANDO" | "LISTO" | "ENTREGADO";

export interface DetallePedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  observaciones: string;
}

export interface Pedido {
  id: string;
  restaurantId: string;
  numeroPedido: number;
  mesaId: string;
  mesaNumero: string;
  tipo: TipoPedido;
  estado: EstadoPedido;
  total: number;
  fechaCreacion: Date;
  detalles: DetallePedido[];
  infoCliente?: {
    nombre: string;
    telefono: string;
    direccion?: string;
    hora?: string;
  };
}
