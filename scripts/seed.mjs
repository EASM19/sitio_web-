import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, addDoc,
} from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0Qt4yNGzoGGM_gSxppGO7CCOej_zrjzg",
  authDomain: "shopqr-72033.firebaseapp.com",
  projectId: "shopqr-72033",
  storageBucket: "shopqr-72033.firebasestorage.app",
  messagingSenderId: "",
  appId: "",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const RESTAURANT_ID = "restaurante1";

const CATEGORIAS = [
  { nombre: "Pizzas", orden: 1 },
  { nombre: "Comida Ligera", orden: 2 },
  { nombre: "Bebidas", orden: 3 },
  { nombre: "Postres", orden: 4 },
];

const PRODUCTOS = {
  Pizzas: [
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
  Bebidas: [
    { nombre: "Agua Natural", descripcion: "Botella de 600ml", precio: 25, ingredientes: "Agua purificada", imagen: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop" },
    { nombre: "Jugo de Naranja", descripcion: "Jugo natural recién exprimido", precio: 45, ingredientes: "Naranjas frescas", imagen: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop" },
    { nombre: "Coca-Cola", descripcion: "Lata 355ml fría", precio: 30, ingredientes: "Agua carbonatada, azúcar, cafeína", imagen: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop" },
  ],
  Postres: [
    { nombre: "Flan Napolitano", descripcion: "Casero con caramelo", precio: 55, ingredientes: "Huevos, leche, azúcar, vainilla", imagen: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop" },
    { nombre: "Brownie", descripcion: "Brownie de chocolate con nuez", precio: 60, ingredientes: "Chocolate, mantequilla, azúcar, harina, nuez", imagen: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop" },
  ],
};

async function main() {
  try {
    await signInAnonymously(auth);
    console.log("Autenticado de forma anónima");
  } catch (e) {
    const email = process.env.ADMIN_EMAIL;
    const pass = process.env.ADMIN_PASSWORD;
    if (!email || !pass) {
      console.error("No se pudo autenticar. Define ADMIN_EMAIL y ADMIN_PASSWORD.");
      console.error(e);
      process.exit(1);
    }
    await signInWithEmailAndPassword(auth, email, pass);
    console.log("Autenticado como admin");
  }

  const catRef = collection(db, "restaurantes", RESTAURANT_ID, "categorias");
  const existentes = await getDocs(catRef);

  const catIds = {};
  for (const cat of CATEGORIAS) {
    const found = existentes.docs.find((d) => d.data().nombre.toLowerCase() === cat.nombre.toLowerCase());
    if (found) {
      catIds[cat.nombre] = found.id;
      continue;
    }
    const nueva = await addDoc(catRef, {
      restaurantId: RESTAURANT_ID,
      nombre: cat.nombre,
      orden: cat.orden,
      estado: "activa",
    });
    catIds[cat.nombre] = nueva.id;
    console.log("Categoría creada:", cat.nombre);
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
      console.log("Producto creado:", prod.nombre);
    }
  }

  console.log(`Listo: ${agregados} productos agregados.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
