"use client";

import { useEffect, useState } from "react";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Producto, Categoria, DetallePedido } from "@/types";

type TipoPedido = "MESA" | "PARA_LLEVAR" | "DOMICILIO";

export default function PedidoCasaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<Map<string, number>>(new Map());
  const [checkout, setCheckout] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");
  const [numeroPedido, setNumeroPedido] = useState(0);

  const [tipo, setTipo] = useState<TipoPedido>("MESA");
  const [mesaNumero, setMesaNumero] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [hora, setHora] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      try {
        const catQuery = query(
          collection(db, "restaurantes", "restaurante1", "categorias"),
          where("estado", "==", "activa")
        );
        const catSnap = await getDocs(catQuery);
        const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria);
        cats.sort((a, b) => a.orden - b.orden);
        setCategorias(cats);

        const prodQuery = query(
          collection(db, "restaurantes", "restaurante1", "productos"),
          where("estado", "==", "activo")
        );
        const prodSnap = await getDocs(prodQuery);
        const prods = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto);
        setProductos(prods);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    cargarDatos();
  }, []);

  const agregar = (id: string) => {
    setCarrito((p) => { const n = new Map(p); n.set(id, (n.get(id) || 0) + 1); return n; });
  };

  const cambiar = (id: string, delta: number) => {
    setCarrito((p) => {
      const n = new Map(p);
      const a = (n.get(id) || 0) + delta;
      if (a <= 0) n.delete(id); else n.set(id, a);
      return n;
    });
  };

  const total = Array.from(carrito.entries()).reduce((t, [id, cant]) => {
    const p = productos.find((x) => x.id === id);
    return t + (p ? p.precio * cant : 0);
  }, 0);

  const cantTotal = Array.from(carrito.values()).reduce((a, b) => a + b, 0);

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono) return;
    if (tipo === "DOMICILIO" && !direccion) return;
    if (tipo === "PARA_LLEVAR" && !hora) return;
    if (tipo === "MESA" && !mesaNumero) return;

    setEnviando(true);
    setError("");
    try {
      const ref = collection(db, "restaurantes", "restaurante1", "pedidos");
      const lastQ = query(ref, orderBy("numeroPedido", "desc"), limit(1));
      const lastS = await getDocs(lastQ);
      const next = lastS.empty ? 1 : (lastS.docs[0].data().numeroPedido || 0) + 1;

      const detalles: DetallePedido[] = Array.from(carrito.entries())
        .map(([id, cant]) => {
          const p = productos.find((x) => x.id === id);
          return p ? { productoId: id, nombre: p.nombre, cantidad: cant, precio: p.precio, observaciones: "" } : null;
        })
        .filter(Boolean) as DetallePedido[];

      await addDoc(ref, {
        restaurantId: "restaurante1",
        numeroPedido: next,
        mesaId: tipo === "MESA" ? mesaNumero : "",
        mesaNumero: tipo === "MESA" ? mesaNumero : "",
        tipo,
        estado: "RECIBIDO",
        total,
        fechaCreacion: serverTimestamp(),
        detalles,
        infoCliente: { nombre, telefono, direccion, hora },
      });

      setNumeroPedido(next);
      setExito(true);
    } catch (err) {
      console.error(err);
      setError("Error al enviar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pedido Enviado</h2>
          <p className="text-gray-600 mb-1">Pedido <span className="font-bold">#{numeroPedido}</span></p>
          <p className="text-green-600 font-medium mb-6">Estado: Recibido</p>
          <a
            href="/pedido"
            className="block w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-bold shadow"
          >
            Consultar mi pedido
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 pb-24">
      <header className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">🍽️ Nuestro Menú</h1>
          {cantTotal > 0 && (
            <button
              onClick={() => setCheckout(true)}
              className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-sm font-bold"
            >
              Carrito ({cantTotal}) ${total.toFixed(2)}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {checkout ? (
          <div>
            <button onClick={() => setCheckout(false)} className="text-red-600 font-bold mb-4">
              ← Volver al menú
            </button>
            <form onSubmit={confirmar} className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-3">¿Cómo quieres tu pedido?</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(["MESA", "PARA_LLEVAR", "DOMICILIO"] as TipoPedido[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                        tipo === t
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {t === "MESA" ? "🪑 Mesa" : t === "PARA_LLEVAR" ? "🛍️ Llevar" : "🏠 Domicilio"}
                    </button>
                  ))}
                </div>

                {tipo === "MESA" && (
                  <input
                    type="text"
                    value={mesaNumero}
                    onChange={(e) => setMesaNumero(e.target.value)}
                    placeholder="Número de mesa *"
                    className="w-full mt-3 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                    style={{ color: "#1f2937" }}
                  />
                )}
                {tipo === "DOMICILIO" && (
                  <textarea
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección completa *"
                    rows={2}
                    className="w-full mt-3 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none"
                    style={{ color: "#1f2937" }}
                  />
                )}
                {tipo === "PARA_LLEVAR" && (
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full mt-3 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                    style={{ color: "#1f2937" }}
                  />
                )}
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                <h2 className="font-bold text-gray-800">Tus datos</h2>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre *"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                  style={{ color: "#1f2937" }}
                />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Teléfono *"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none"
                  style={{ color: "#1f2937" }}
                />
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-2">Tu pedido</h2>
                {Array.from(carrito.entries()).map(([id, cant]) => {
                  const p = productos.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex justify-between text-sm py-1">
                      <span>{cant}x {p.nombre}</span>
                      <span>${(p.precio * cant).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-red-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Confirmar Pedido"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {categorias.map((cat) => {
              const prods = productos.filter((p) => p.categoriaId === cat.id && p.disponible);
              if (prods.length === 0) return null;
              return (
                <section key={cat.id}>
                  <h2 className="text-lg font-bold text-gray-800 mb-3">{cat.nombre}</h2>
                  <div className="space-y-3">
                    {prods.map((prod) => {
                      const cant = carrito.get(prod.id) || 0;
                      return (
                        <div key={prod.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
                          {prod.imagen ? (
                            <img src={prod.imagen} alt={prod.nombre} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-2xl">🍽️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2">
                              <h3 className="font-semibold text-gray-800">{prod.nombre}</h3>
                              <span className="text-red-600 font-bold">${prod.precio.toFixed(2)}</span>
                            </div>
                            {prod.descripcion && <p className="text-sm text-gray-500 mt-1">{prod.descripcion}</p>}
                            {prod.ingredientes && <p className="text-xs text-gray-400 mt-1">{prod.ingredientes}</p>}
                            <div className="mt-2">
                              {cant === 0 ? (
                                <button onClick={() => agregar(prod.id)} className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold">
                                  Agregar
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => cambiar(prod.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold">-</button>
                                  <span className="font-bold w-6 text-center">{cant}</span>
                                  <button onClick={() => agregar(prod.id)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold">+</button>
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
            {categorias.length === 0 && (
              <p className="text-center text-gray-500 py-12">No hay productos disponibles aún.</p>
            )}
          </div>
        )}
      </main>

      {cantTotal > 0 && !checkout && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold">{cantTotal} productos</p>
              <p className="text-red-600 font-bold text-lg">${total.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setCheckout(true)}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow"
            >
              Hacer Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
