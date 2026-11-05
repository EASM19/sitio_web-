import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const U = (id) => `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop`;

const MAP = {
  // De Nuestra Cocina
  "Torta ahogada": U("1528735602780-2552fd46c7af"),
  "Tacos dorados 5 piezas": U("1552332386-f8dd00dc2f85"),
  "Hamburguesa de sirloin": U("1568901346375-23c9450c58cd"),
  "Hamburguesa de camarón": U("1568901346375-23c9450c58cd"),
  "Papas gajo": U("1576107232684-1279f390859f"),
  "Papas a la francesa": U("1573080496219-bb080dd4f877"),
  "Orden de alitas": U("1608039755401-742074f0548d"),
  "Tostada de trompa": U("1613514785940-daed07799d9b"),
  "Tostada de cuero": U("1613514785940-daed07799d9b"),
  "Tosticarne": U("1613514785940-daed07799d9b"),
  "Rico Menudo (domingos)": U("1547592166-23ac45744acd"),

  // Barra Fría - Mariscos
  "Tostada especial 1 persona": U("1613514785940-daed07799d9b"),
  "Tostada especial 2 personas": U("1615141982883-c7ad0e69fd62"),
  "Callos de tilapia": U("1580476262798-bddd9f4b7369"),
  "Aguachile original": U("1565680018434-b513d5e5fd47"),
  "Aguachile mixto": U("1565680018434-b513d5e5fd47"),
  "Pa picar": U("1559737558-2f5a35f4523b"),
  "Sashimi": U("1579584425555-c3ce17fd4351"),

  // Cortes de Carne
  "T-bone": U("1600891964092-4316c288032e"),
  "Arrachera": U("1544025162-d76694265947"),
  "New York - Angus Beef": U("1546964124-0cce460f38ef"),
  "Camarones a la bóveda": U("1559737558-2f5a35f4523b"),

  // Postres
  "Pay tortuga rebanada": U("1571115177098-24ec42ed204d"),
  "Pay de queso flambée rebanada": U("1533134242443-d4fd215305ad"),
  "Mini pastel cumpleañero": U("1578985545062-69928b1d9587"),

  // Refrescos y Calientes
  "Cocacola 355ml": U("1554866585-cd94860890b7"),
  "Pepsi 355ml": U("1629203851122-3726ecdf080e"),
  "Mirinda lata 355ml": U("1624517452488-04869289c4ca"),
  "Manzanita Sol 355ml": U("1613478223719-2ab802602423"),
  "Seven Up 355ml": U("1625772299848-391b6a87d7b3"),
  "Agua mineral 355ml": U("1548839140-29a749e1cf4d"),
  "Jumex néctar 200ml": U("1600271886742-f049cd451bba"),
  "Agua embotellada 355ml": U("1548839140-29a749e1cf4d"),
  "Café clásico": U("1495474472287-4d71bcdd2085"),
  "Café de olla": U("1509042239860-f550ce710b93"),
  "Canela": U("1495474472287-4d71bcdd2085"),

  // Bebidas Preparadas - Palomas
  "Paloma · Mezcal Santa Teresa cristalino": U("1609951651556-5334e2706168"),
  "Paloma · Mezcal Don Antonio Briones cristalino": U("1609951651556-5334e2706168"),
  "Paloma · Centenario Plata": U("1609951651556-5334e2706168"),
  "Paloma · Centenario Reposado": U("1544145945-f90425340c7e"),
  "Paloma · José Cuervo": U("1544145945-f90425340c7e"),
  "Paloma · Maestro Dobel": U("1560512823-829485b8bf24"),
  "Paloma · Mezcal Santa Teresa Reposado": U("1560512823-829485b8bf24"),
  "Paloma · Patrón Silver": U("1609951651556-5334e2706168"),
  "Paloma · Patrón Añejo": U("1541546006121-5c3bc5e8c7b9"),
  "Paloma · Don Julio 70": U("1541546006121-5c3bc5e8c7b9"),

  // Mojitos
  "Mojito · Mezcal Santa Teresa cristalino": U("1546171753-97d7676e4602"),
  "Mojito · Mezcal Antonio Briones cristalino": U("1551538827-9c037cb4f32a"),
  "Mojito · Bacardí": U("1546171753-97d7676e4602"),

  // Vampiros
  "Vampiro · Mezcal Santa Teresa cristalino": U("1595981267035-7b04ca84a82d"),
  "Vampiro · Mezcal Don Antonio Briones": U("1595981267035-7b04ca84a82d"),
  "Vampiro · Centenario Plata": U("1560508180-03f285f67ded"),
  "Vampiro · Centenario Reposado": U("1560508180-03f285f67ded"),
  "Vampiro · José Cuervo": U("1595981267035-7b04ca84a82d"),
  "Vampiro · Maestro Dobel": U("1560508180-03f285f67ded"),
  "Vampiro · Mezcal Santa Teresa Reposado": U("1595981267035-7b04ca84a82d"),
  "Vampiro · Patrón Silver": U("1560508180-03f285f67ded"),
  "Vampiro · Patrón Añejo": U("1595981267035-7b04ca84a82d"),
  "Vampiro · Don Julio 70": U("1560508180-03f285f67ded"),

  // Combinados
  "Crajillo": U("1560508180-03f285f67ded"),
  "Piña Colada": U("1544145945-f90425340c7e"),
  "Piña Colada (sin alcohol)": U("1544145945-f90425340c7e"),
  "Limonada": U("1621263764928-df1444c5e859"),

  // Vinos y Cervezas
  "Cuatro Soles Merlot": U("1474722883778-792e7990302f"),
  "Riuñte Lambrusco": U("1553361371-9b22f78e8b1d"),
  "Monte Ciego Rioja": U("1510812431401-41d2bd2722f3"),
  "El Somo Rioja": U("1516594915697-87eb3b1c14ea"),
  "Corona 355ml": U("1608270586620-248524c67de9"),
  "Cerveza Victoria 355ml": U("1535958636474-b021ee887b13"),
  "Mixtelada Corona 355ml": U("1567696911980-2eed69a46042"),
  "Mixtelada Victoria 355ml": U("1584225064785-c62a8b43d148"),
  "Micheloza": U("1608270586620-248524c67de9"),
  "Chelada": U("1535958636474-b021ee887b13"),
  "Preparado": U("1584225064785-c62a8b43d148"),

  // Shots
  "Shot Centenario Plata": U("1514362545857-3bc16c4c7d1b"),
  "Shot Centenario Reposado": U("1514362545857-3bc16c4c7d1b"),
  "Shot Red Label": U("1527281400683-1aae777175f8"),
  "Shot José Cuervo": U("1541546006121-5c3bc5e8c7b9"),
  "Shot Captain Morgan": U("1614313511387-1436a4480ebb"),
  "Shot Maestro Dobel": U("1514362545857-3bc16c4c7d1b"),
  "Shot Patrón Silver": U("1541546006121-5c3bc5e8c7b9"),
  "Shot Patrón Añejo": U("1607622750671-6cd9a99eabd1"),
  "Shot Don Julio 70": U("1607622750671-6cd9a99eabd1"),
  "Shot Black & White": U("1569529465841-dfecdab7503b"),
  "Shot Smirnoff": U("1607622750671-6cd9a99eabd1"),
  "Shot Jim Beam Bourbon": U("1569529465841-dfecdab7503b"),
  "Shot Bacardí": U("1614313511387-1436a4480ebb"),

  // Destilados
  "Destilado Centenario Plata": U("1514362545857-3bc16c4c7d1b"),
  "Destilado Centenario Reposado": U("1514362545857-3bc16c4c7d1b"),
  "Destilado Red Label": U("1569529465841-dfecdab7503b"),
  "Destilado José Cuervo": U("1541546006121-5c3bc5e8c7b9"),
  "Destilado Captain Morgan": U("1614313511387-1436a4480ebb"),
  "Destilado Maestro Dobel": U("1607622750671-6cd9a99eabd1"),
  "Destilado Patrón Silver": U("1541546006121-5c3bc5e8c7b9"),
  "Destilado Patrón Añejo": U("1607622750671-6cd9a99eabd1"),
  "Destilado Don Julio 70": U("1607622750671-6cd9a99eabd1"),
  "Destilado Black & White": U("1527281400683-1aae777175f8"),
  "Destilado Smirnoff": U("1597290282695-edc43d0e7129"),
  "Destilado Jim Beam Bourbon": U("1569529465841-dfecdab7503b"),
  "Mezcal de la Casa": U("1514362545857-3bc16c4c7d1b"),

  // Digestivos
  "Licor 43 shot": U("1607622750671-6cd9a99eabd1"),
  "Baileys shot": U("1607622750671-6cd9a99eabd1"),

  // Servicios (Botellas)
  "Don Ramón": U("1541546006121-5c3bc5e8c7b9"),
  "Centenario Plata": U("1541546006121-5c3bc5e8c7b9"),
  "Centenario Reposado": U("1597290282695-edc43d0e7129"),
  "José Cuervo": U("1541546006121-5c3bc5e8c7b9"),
  "Maestro Dobel": U("1597290282695-edc43d0e7129"),
  "Patrón Silver": U("1597290282695-edc43d0e7129"),
  "Patrón Añejo": U("1597290282695-edc43d0e7129"),
  "Don Julio 70": U("1597290282695-edc43d0e7129"),
  "Red Label": U("1527281400683-1aae777175f8"),
  "Black & White": U("1569529465841-dfecdab7503b"),
  "Jim Beam Bourbon": U("1569529465841-dfecdab7503b"),
  "Bacardí": U("1614313511387-1436a4480ebb"),
  "Captain Morgan": U("1614313511387-1436a4480ebb"),
  "Smirnoff": U("1597290282695-edc43d0e7129"),

  // Cata Mezcal
  "Mezcal de la Casa · Cristalino Suelto": U("1514362545857-3bc16c4c7d1b"),
  "Mezcal Cristalino · Santa Teresa": U("1514362545857-3bc16c4c7d1b"),
  "Mezcal Cristalino 4° · Santa Teresa": U("1607622750671-6cd9a99eabd1"),
  "Crema de Mezcal Taro": U("1607622750671-6cd9a99eabd1"),
  "Crema de Mezcal Café": U("1495474472287-4d71bcdd2085"),
  "Mezcal Cristalino Suelto · Don Antonio Briones": U("1514362545857-3bc16c4c7d1b"),
  "Mezcal Cristalino 1° · Don Antonio Briones": U("1541546006121-5c3bc5e8c7b9"),
  "Mezcal Cristalino 3° · Don Antonio Briones": U("1541546006121-5c3bc5e8c7b9"),
  "Mezcal Cristalino 4° · Don Antonio Briones": U("1607622750671-6cd9a99eabd1"),
  "Licor de Viznaga": U("1607622750671-6cd9a99eabd1"),
  "Licor de Café": U("1509042239860-f550ce710b93"),
};

const aqui = dirname(fileURLToPath(import.meta.url));
const ruta = join(aqui, "..", "src", "lib", "menu-nuevo.json");
const menu = JSON.parse(readFileSync(ruta, "utf8"));

let puestos = 0;
const faltantes = [];
for (const p of menu.productos) {
  const img = MAP[p.nombre];
  if (!img) { faltantes.push(p.nombre); continue; }
  p.imagen = img;
  puestos++;
}

writeFileSync(ruta, JSON.stringify(menu, null, 2) + "\n", "utf8");
console.log(`Imágenes asignadas: ${puestos}/${menu.productos.length}`);
if (faltantes.length) {
  console.log("SIN IMAGEN:");
  faltantes.forEach((n) => console.log(" - " + n));
  process.exit(1);
}
