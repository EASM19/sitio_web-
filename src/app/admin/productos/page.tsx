"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import type { Producto, Categoria } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RESTAURANT_ID = "restaurante1";

export default function ProductosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [ingredientes, setIngredientes] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenUrl, setImagenUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [nuevaCat, setNuevaCat] = useState("");
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false);
  const [creandoCat, setCreandoCat] = useState(false);
  const [error, setError] = useState("");

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
    cargarDatos();
  }, [user]);

  const cargarDatos = async () => {
    try {
      const catSnap = await getDocs(
        collection(db, "restaurantes", RESTAURANT_ID, "categorias")
      );
      setCategorias(catSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria));

      const prodSnap = await getDocs(
        collection(db, "restaurantes", RESTAURANT_ID, "productos")
      );
      setProductos(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !categoriaId) return;

    setGuardando(true);
    setError("");
    try {
      let imagenFinal = imagenUrl || editando?.imagen || "";

      if (imagen) {
        try {
          const storageRef = ref(
            storage,
            `productos/${Date.now()}_${imagen.name}`
          );
          await uploadBytes(storageRef, imagen);
          imagenFinal = await getDownloadURL(storageRef);
        } catch (imgErr) {
          console.error("Error subiendo imagen:", imgErr);
          setError("No se pudo subir la imagen, se usará la URL si la tienes");
        }
      }

      const datos = {
        restaurantId: RESTAURANT_ID,
        nombre,
        descripcion,
        precio: parseFloat(precio),
        ingredientes,
        imagen: imagenFinal,
        categoriaId,
        disponible: editando?.disponible ?? true,
        estado: "activo",
      };

      if (editando) {
        await updateDoc(
          doc(db, "restaurantes", RESTAURANT_ID, "productos", editando.id),
          datos
        );
      } else {
        await addDoc(
          collection(db, "restaurantes", RESTAURANT_ID, "productos"),
          datos
        );
      }

      limpiarForm();
      cargarDatos();
    } catch (err) {
      console.error("Error guardando producto:", err);
      setError("Error al guardar. Verifica que Firebase Firestore esté activo.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteDoc(doc(db, "restaurantes", RESTAURANT_ID, "productos", id));
    cargarDatos();
  };

  const crearCategoria = async () => {
    if (!nuevaCat.trim()) return;
    setCreandoCat(true);
    try {
      const snap = await getDocs(
        query(collection(db, "restaurantes", RESTAURANT_ID, "categorias"), orderBy("orden"))
      );
      const orden = snap.size + 1;
      const nueva = await addDoc(
        collection(db, "restaurantes", RESTAURANT_ID, "categorias"),
        {
          restaurantId: RESTAURANT_ID,
          nombre: nuevaCat.trim(),
          orden,
          estado: "activa",
        }
      );
      setCategoriaId(nueva.id);
      setNuevaCat("");
      setMostrarNuevaCat(false);
      cargarDatos();
    } catch (err) {
      console.error(err);
    } finally {
      setCreandoCat(false);
    }
  };

  const toggleDisponible = async (producto: Producto) => {
    await updateDoc(
      doc(db, "restaurantes", RESTAURANT_ID, "productos", producto.id),
      { disponible: !producto.disponible }
    );
    cargarDatos();
  };

  const editarProducto = (producto: Producto) => {
    setEditando(producto);
    setNombre(producto.nombre);
    setDescripcion(producto.descripcion);
    setPrecio(producto.precio.toString());
    setIngredientes(producto.ingredientes);
    setCategoriaId(producto.categoriaId);
    setImagen(null);
    setImagenUrl(producto.imagen || "");
    setMostrarForm(true);
  };

  const limpiarForm = () => {
    setEditando(null);
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setIngredientes("");
    setCategoriaId("");
    setImagen(null);
    setImagenUrl("");
    setMostrarForm(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/pedidos" className="text-gray-500 hover:text-gray-700 font-medium">Pedidos</Link>
            <Link href="/admin/productos" className="text-red-600 font-bold text-lg">Productos</Link>
            <Link href="/admin/categorias" className="text-gray-500 hover:text-gray-700 font-medium">Categorías</Link>
            <Link href="/admin/ventas" className="text-gray-500 hover:text-gray-700 font-medium">Ventas</Link>
            <Link href="/admin/mesas" className="text-gray-500 hover:text-gray-700 font-medium">QR</Link>
          </div>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">{productos.length} productos</p>
          <button
            onClick={() => setMostrarForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
          >
            Nuevo Producto
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">
              {editando ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <form onSubmit={guardarProducto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <div className="flex gap-2">
                  <select
                    value={mostrarNuevaCat ? "__nueva__" : categoriaId}
                    onChange={(e) => {
                      if (e.target.value === "__nueva__") {
                        setMostrarNuevaCat(true);
                        setCategoriaId("");
                      } else {
                        setMostrarNuevaCat(false);
                        setCategoriaId(e.target.value);
                      }
                    }}
                    required={!mostrarNuevaCat}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seleccionar</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                    <option value="__nueva__">+ Nueva categoría</option>
                  </select>
                </div>
                {mostrarNuevaCat && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={nuevaCat}
                      onChange={(e) => setNuevaCat(e.target.value)}
                      placeholder="Nombre de la categoría"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      style={{ color: "#1f2937" }}
                    />
                    <button
                      type="button"
                      onClick={crearCategoria}
                      disabled={creandoCat || !nuevaCat.trim()}
                      className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                    >
                      {creandoCat ? "..." : "Crear"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMostrarNuevaCat(false); setNuevaCat(""); }}
                      className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (URL)</label>
                <input
                  type="url"
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ color: "#1f2937" }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagen(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                />
                {imagenUrl && (
                  <img src={imagenUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover mt-2" />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredientes</label>
                <input
                  type="text"
                  value={ingredientes}
                  onChange={(e) => setIngredientes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2 flex gap-3 items-center">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={limpiarForm}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancelar
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-3">
            {productos.map((producto) => (
              <div
                key={producto.id}
                className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
              >
                {producto.imagen && (
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{producto.nombre}</h3>
                  <p className="text-red-600 font-bold">${producto.precio.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    {categorias.find((c) => c.id === producto.categoriaId)?.nombre}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDisponible(producto)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      producto.disponible
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {producto.disponible ? "Disponible" : "Agotado"}
                  </button>
                  <button
                    onClick={() => editarProducto(producto)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium"
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
