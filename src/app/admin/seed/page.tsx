"use client";

import { useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RESTAURANT_ID = "restaurante1";

const CATEGORIAS = [
  { nombre: "Pizzas", orden: 1 },
  { nombre: "Comida Ligera", orden: 2 },
  { nombre: "Bebidas", orden: 3 },
  { nombre: "Postres", orden: 4 },
];

const PRODUCTOS: Record<string, { nombre: string; descripcion: string; precio: number; ingredientes: string; imagen: string }[]> = {
  "Pizzas": [
    { nombre: "Pizza Pepperoni", descripcion: "Clásica con pepperoni y queso mozzarella", precio: 189, ingredientes: "Masa, salsa de tomate, queso mozzarella, pepperoni", imagen: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=400&fit=crop" },
    { nombre: "Pizza Piña", descripcion: "Piña dulce y queso sobre masa tradicional", precio: 179, ingredientes: "Masa, salsa de tomate, queso, piña", imagen: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop" },
    { nombre: "Pizza Mexicana", descripcion: "Chorizo, jalapeños y queso Oaxaca", precio: 199, ingredientes: "Masa, salsa de tomate, queso, chorizo, jalapeños, cebolla", imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop" },
    { nombre: "Pizza Hawaiana", descripcion: "Piña, jamón y queso mozzarella", precio: 185, ingredientes: "Masa, salsa de tomate, queso, jamón, piña", imagen: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop" },
    { nombre: "Pizza Vegetariana", descripcion: "Verduras frescas y queso mozzarella", precio: 169, ingredientes: "Masa, salsa de tomate, queso, pimientos, cebolla, champiñones", imagen: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=400&fit=crop" },
    { nombre: "Pizza Cuatro Quesos", descripcion: "Mozzarella, parmesano, gouda y azul", precio: 209, ingredientes: "Masa, mozzarella, parmesano, gouda, queso azul", imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop" },
    { nombre: "Pizza Jamón y Champiñones", descripcion: "Jamón de pierna y champiñones frescos", precio: 185, ingredientes: "Masa, salsa de tomate, queso, jamón, champiñones", imagen: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=400&h=400&fit=crop" },
    { nombre: "Pizza BBQ", descripcion: "Pollo BBQ, cebolla morada y queso", precio: 195, ingredientes: "Masa, salsa BBQ, pollo, cebolla morada, queso mozzarella", imagen: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=400&fit=crop" },
  ],
  "Comida Ligera": [
    { nombre: "Ensalada César", descripcion: "Lechuga romana, aderezo césar y crotones", precio: 95, ingredientes: "Lechuga romana, aderezo césar, crotones, parmesano", imagen: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=400&fit=crop" },
    { nombre: "Sándwich de Pollo", descripcion: "Pan tostado con pollo a la plancha", precio: 89, ingredientes: "Pan, pollo, lechuga, tomate, aderezo", imagen: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop" },
    { nombre: "Wrap de Atún", descripcion: "Tortilla de harina con atún fresco", precio: 85, ingredientes: "Tortilla, atún, lechuga, tomate, aderezo", imagen: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=400&fit=crop" },
  ],
  "Bebidas": [
    { nombre: "Agua Natural", descripcion: "Botella de 600ml", precio: 25, ingredientes: "Agua purificada", imagen: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop" },
    { nombre: "Jugo de Naranja", descripcion: "Jugo natural recién exprimido", precio: 45, ingredientes: "Naranjas frescas", imagen: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop" },
    { nombre: "Coca-Cola", descripcion: "Lata 355ml fría", precio: 30, ingredientes: "Agua carbonatada, azúcar, cafeína", imagen: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop" },
  ],
  "Postres": [
    { nombre: "Flan Napolitano", descripcion: "Casero con caramelo", precio: 55, ingredientes: "Huevos, leche, azúcar, vainilla", imagen: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop" },
    { nombre: "Brownie", descripcion: "Brownie de chocolate con nuez", precio: 60, ingredientes: "Chocolate, mantequilla, azúcar, harina, nuez", imagen: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop" },
  ],
};

export default function SeedPage() {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const ejecutarSeed = async () => {
    setCargando(true);
    setMensaje("");
    try {
      const catRef = collection(db, "restaurantes", RESTAURANT_ID, "categorias");
      const existentes = await getDocs(catRef);
      const nombresExistentes = existentes.docs.map((d) => d.data().nombre.toLowerCase());

      const catIds: Record<string, string> = {};

      for (const cat of CATEGORIAS) {
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
      for (const [catNombre, prods] of Object.entries(PRODUCTOS)) {
        for (const prod of prods) {
          if (nombresProds.includes(prod.nombre.toLowerCase())) continue;
          await addDoc(prodRef, {
            restaurantId: RESTAURANT_ID,
            nombre: prod.nombre,
            descripcion: prod.descripcion,
            precio: prod.precio,
            ingredientes: prod.ingredientes,
            imagen: prod.imagen,
            categoriaId: catIds[catNombre] || "",
            disponible: true,
            estado: "activo",
          });
          agregados++;
        }
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Datos de Prueba</h1>
        <p className="text-gray-500 text-sm mb-6">
          Agrega categorías y productos de ejemplo al menú
        </p>
        <button
          onClick={ejecutarSeed}
          disabled={cargando}
          className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 shadow mb-4"
        >
          {cargando ? "Agregando datos..." : "Agregar datos de prueba"}
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
