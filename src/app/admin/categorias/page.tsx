"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Categoria } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RESTAURANT_ID = "restaurante1";

export default function CategoriasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [creando, setCreando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/admin/login");
      } else {
        setUser(u);
      }
    });
    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    cargarCategorias();
  }, [user]);

  const cargarCategorias = async () => {
    try {
      const snap = await getDocs(
        collection(db, "restaurantes", RESTAURANT_ID, "categorias")
      );
      const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria);
      cats.sort((a, b) => a.orden - b.orden);
      setCategorias(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;

    setCreando(true);
    try {
      const orden = categorias.length + 1;
      await addDoc(collection(db, "restaurantes", RESTAURANT_ID, "categorias"), {
        restaurantId: RESTAURANT_ID,
        nombre: nuevaCategoria.trim(),
        orden,
        estado: "activa",
      });
      setNuevaCategoria("");
      cargarCategorias();
    } catch (err) {
      console.error(err);
    } finally {
      setCreando(false);
    }
  };

  const agregarCategoriasEjemplo = async () => {
    setCreando(true);
    try {
      const existentes = categorias.map((c) => c.nombre.toLowerCase());
      const ejemplos = ["Pizzas", "Comida Ligera"];
      let orden = categorias.length + 1;

      for (const nombre of ejemplos) {
        if (!existentes.includes(nombre.toLowerCase())) {
          await addDoc(collection(db, "restaurantes", RESTAURANT_ID, "categorias"), {
            restaurantId: RESTAURANT_ID,
            nombre,
            orden,
            estado: "activa",
          });
          orden++;
        }
      }
      cargarCategorias();
    } catch (err) {
      console.error(err);
    } finally {
      setCreando(false);
    }
  };

  const toggleEstado = async (categoria: Categoria) => {
    await updateDoc(
      doc(db, "restaurantes", RESTAURANT_ID, "categorias", categoria.id),
      { estado: categoria.estado === "activa" ? "inactiva" : "activa" }
    );
    cargarCategorias();
  };

  const eliminarCategoria = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await deleteDoc(doc(db, "restaurantes", RESTAURANT_ID, "categorias", id));
    cargarCategorias();
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-gray-500 hover:text-gray-700 font-medium">Pedidos</Link>
            <Link href="/admin/productos" className="text-gray-500 hover:text-gray-700 font-medium">Productos</Link>
            <Link href="/admin/categorias" className="text-red-600 font-bold text-lg">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Nueva Categoría</h2>
          <form onSubmit={crearCategoria} className="flex gap-3">
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Nombre de la categoría"
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              style={{ color: "#1f2937" }}
            />
            <button
              type="submit"
              disabled={creando}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 disabled:opacity-50 shadow"
            >
              {creando ? "Creando..." : "Agregar"}
            </button>
          </form>
          <button
            onClick={agregarCategoriasEjemplo}
            disabled={creando}
            className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline"
          >
            Agregar categorías de ejemplo (Pizzas, Comida Ligera)
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-3">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-gray-800">{categoria.nombre}</h3>
                  <p className="text-sm text-gray-500">Orden: {categoria.orden}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEstado(categoria)}
                    className={`px-3 py-1 rounded-lg text-sm font-bold ${
                      categoria.estado === "activa"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {categoria.estado === "activa" ? "Activa" : "Inactiva"}
                  </button>
                  <button
                    onClick={() => eliminarCategoria(categoria.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
