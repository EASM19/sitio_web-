"use client";

import type { Producto, Categoria } from "@/types";

interface MenuClienteProps {
  productos: Producto[];
  categorias: Categoria[];
  carrito: Map<string, number>;
  agregarAlCarrito: (productoId: string) => void;
}

export default function MenuCliente({
  productos,
  categorias,
  carrito,
  agregarAlCarrito,
}: MenuClienteProps) {
  if (categorias.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay productos disponibles por el momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categorias.map((categoria) => {
        const productosCat = productos.filter((p) => p.categoriaId === categoria.id);
        if (productosCat.length === 0) return null;

        return (
          <section key={categoria.id}>
            <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">
              {categoria.nombre}
            </h2>
            <div className="grid gap-3">
              {productosCat.map((producto) => {
                const cantidad = carrito.get(producto.id) || 0;
                const noDisponible = !producto.disponible;

                return (
                  <div
                    key={producto.id}
                    className={`bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex gap-4 ${
                      noDisponible ? "opacity-50" : ""
                    }`}
                  >
                    {producto.imagen && (
                      <img
                        src={producto.imagen}
                        alt={producto.nombre}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-800">{producto.nombre}</h3>
                        <span className="text-rose-600 font-bold whitespace-nowrap">
                          ${producto.precio.toFixed(2)}
                        </span>
                      </div>
                      {producto.descripcion && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {producto.descripcion}
                        </p>
                      )}
                      {producto.ingredientes && (
                        <p className="text-xs text-gray-400 mt-1">
                          {producto.ingredientes}
                        </p>
                      )}
                      <div className="mt-3">
                        {noDisponible ? (
                          <span className="text-sm text-gray-400 font-medium">Agotado</span>
                        ) : cantidad === 0 ? (
                          <button
                            onClick={() => agregarAlCarrito(producto.id)}
                            className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition"
                          >
                            Agregar
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                              {cantidad} en carrito
                            </span>
                            <button
                              onClick={() => agregarAlCarrito(producto.id)}
                              className="text-rose-600 text-sm font-medium hover:underline"
                            >
                              + Agregar otro
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
