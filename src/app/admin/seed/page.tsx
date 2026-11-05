"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useSesionActiva } from "@/hooks/useSesionActiva";
import { useAvisosPedido } from "@/hooks/useAvisosPedido";
import menu from "@/lib/menu-nuevo.json";

const RESTAURANT_ID = "restaurante1";

export default function SeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();
  useSesionActiva(user);
  useAvisosPedido(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/admin/login");
      else setUser(u);
    });
    return () => unsub();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6efdc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const ejecutarSeed = async () => {
    setCargando(true);
    setMensaje("");
    try {
      const catRef = collection(db, "restaurantes", RESTAURANT_ID, "categorias");
      const existentes = await getDocs(catRef);
      const nombresExistentes = existentes.docs.map((d) => d.data().nombre.toLowerCase());

      const catIds: Record<string, string> = {};

      for (const cat of menu.categorias) {
        if (nombresExistentes.includes(cat.nombre.toLowerCase())) {
          const found = existentes.docs.find((d) => d.data().nombre.toLowerCase() === cat.nombre.toLowerCase());
          if (found) catIds[cat.nombre] = found.id;
          continue;
        }
        const nueva = await addDoc(catRef, {
          restaurantId: RESTAURANT_ID,
          nombre: cat.nombre,
          orden: cat.orden,
          estado: "activa",
        });
        catIds[cat.nombre] = nueva.id;
      }

      const prodRef = collection(db, "restaurantes", RESTAURANT_ID, "productos");
      const prodsExistentes = await getDocs(prodRef);
      const nombresProds = prodsExistentes.docs.map((d) => d.data().nombre.toLowerCase());

      let agregados = 0;
      for (const prod of menu.productos) {
        if (nombresProds.includes(prod.nombre.toLowerCase())) continue;
        await addDoc(prodRef, {
          restaurantId: RESTAURANT_ID,
          nombre: prod.nombre,
          descripcion: prod.descripcion || "",
          precio: prod.precio,
          ingredientes: "",
          imagen: prod.imagen || "",
          categoriaId: catIds[prod.categoria] || "",
          disponible: true,
          estado: "activo",
        });
        agregados++;
      }

      setMensaje(`Listo! ${agregados} productos agregados. Ve a /pedido-casa para ver el menú.`);
    } catch (err) {
      console.error(err);
      setMensaje("Error al agregar datos. Revisa la consola.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6efdc] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Menú La Bóveda</h1>
        <p className="text-gray-500 text-sm mb-6">
          Carga las categorías y productos del menú real (faltantes)
        </p>
        <button
          onClick={ejecutarSeed}
          disabled={cargando}
          className="w-full bg-amber-800 text-white py-3 rounded-xl font-bold hover:bg-amber-900 disabled:opacity-50 shadow mb-4"
        >
          {cargando ? "Agregando datos..." : "Cargar menú La Bóveda"}
        </button>
        {mensaje && <p className="text-green-600 font-medium mb-4">{mensaje}</p>}
        <div className="flex gap-3">
          <a href="/pedido-casa" className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium">
            Ver menú
          </a>
          <a href="/admin/productos" className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium">
            Productos
          </a>
        </div>
      </div>
    </div>
  );
}
