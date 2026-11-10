import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(aqui, "..", "src", "lib", "menu-nuevo.json");
const menu = JSON.parse(readFileSync(jsonPath, "utf8"));

const Q = (id) => `https://images.unsplash.com/${id}?w=400&h=400&fit=crop`;

// Pool of unique verified Unsplash IDs by category
const POOL = {
  burger: [
    "photo-1568901346375-23c9450c58cd",
    "photo-1571091718767-18b5b1457add",
    "photo-1550547660-d9450f859349",
    "photo-1553979459-d2229ba7433b",
    "photo-1594212699903-ec8a3eca50f5",
    "photo-1520072959219-c595dc870360",
    "photo-1572802419224-296b0aeee0d9",
    "photo-1606755962773-d324e0a13086",
    "photo-1615297928064-24977384d0da",
    "photo-1551782450-a2132b4ba21d",
    "photo-1550317138-10000687a72b",
    "photo-1499028344343-cd173ffc68a9",
  ],
  taco: [
    "photo-1552332386-f8dd00dc2f85",
    "photo-1551504734-5ee1c4a1479b",
    "photo-1599974579688-8dbdd335c77f",
    "photo-1565299624946-b28f40a0ae38",
    "photo-1565299507177-b0ac66763828",
    "photo-1565299585323-38d6b0865b47",
    "photo-1613514785940-daed07799d9b",
    "photo-1615870216519-2f9fa575fa5c",
  ],
  papa: [
    "photo-1576107232684-1279f390859f",
    "photo-1573080496219-bb080dd4f877",
    "photo-1630384060421-cb20d0e0649d",
    "photo-1518013431117-eb1465fa5752",
  ],
  alitas: [
    "photo-1608039755401-742074f0548d",
    "photo-1527477396000-e27163b481c2",
    "photo-1567620832903-9fc6debc209f",
  ],
  marisco: [
    "photo-1559847844-5315695dadae",
    "photo-1625944230945-1b7dd3b949ab",
    "photo-1565557623262-b51c2513a641",
    "photo-1599487488170-d11ec9c172f0",
    "photo-1565680018434-b513d5e5fd47",
    "photo-1559737558-2f5a35f4523b",
    "photo-1615141982883-c7ad0e69fd62",
    "photo-1579584425555-c3ce17fd4351",
    "photo-1580476262798-bddd9f4b7369",
    "photo-1519708227418-c8fd9a32b7a2",
    "photo-1467003909585-2f8a72700288",
    "photo-1559339352-11d035aa65de",
    "photo-1534604973900-c43ab4c2e0ab",
    "photo-1611143669185-af224c5e3252",
  ],
  cafe: [
    "photo-1495474472287-4d71bcdd2085",
    "photo-1509042239860-f550ce710b93",
    "photo-1442512595331-e89e73853f31",
    "photo-1514432324607-a09d9b4aefdd",
    "photo-1447933601403-0c6688de566e",
    "photo-1461023058943-07fcbe16d735",
    "photo-1511920170033-f8396924c348",
  ],
  coctel: [
    "photo-1470337458703-46ad1756a187",
    "photo-1536935338788-846bb9981813",
    "photo-1574096079513-d8259312b785",
    "photo-1587223962930-cb7f31384c19",
    "photo-1514362545857-3bc16c4c7d1b",
    "photo-1546171753-97d7676e4602",
    "photo-1551538827-9c037cb4f32a",
    "photo-1544145945-f90425340c7e",
    "photo-1609951651556-5334e2706168",
    "photo-1560512823-829485b8bf24",
    "photo-1560508180-03f285f67ded",
    "photo-1595981267035-7b04ca84a82d",
    "photo-1621263764928-df1444c5e859",
    "photo-1556679343-c7306c1976bc",
    "photo-1622597467836-f3285f2131b8",
    "photo-1513558161293-cdaf765ed2fd",
    "photo-1572116469696-31de0f17cc34",
    "photo-1544148103-0773bf10d330",
  ],
  vino: [
    "photo-1474722883778-792e7990302f",
    "photo-1553361371-9b22f78e8b1d",
    "photo-1510812431401-41d2bd2722f3",
    "photo-1516594915697-87eb3b1c14ea",
    "photo-1506377247377-2a5b3b417ebb",
    "photo-1558001373-7b93ee48ffa0",
  ],
  cerveza: [
    "photo-1608270586620-248524c67de9",
    "photo-1535958636474-b021ee887b13",
    "photo-1567696911980-2eed69a46042",
    "photo-1584225064785-c62a8b43d148",
    "photo-1436076863939-06870fe779c2",
  ],
  destilado: [
    "photo-1514218953589-2d7d37efd2dc",
    "photo-1569529465841-dfecdab7503b",
    "photo-1607622750671-6cd9a99eabd1",
    "photo-1541546006121-5c3bc5e8c7b9",
    "photo-1597290282695-edc43d0e7129",
    "photo-1614313511387-1436a4480ebb",
    "photo-1527281400683-1aae777175f8",
  ],
  carne: [
    "photo-1544025162-d76694265947",
    "photo-1546964124-0cce460f38ef",
    "photo-1600891964092-4316c288032e",
    "photo-1504674900247-0877df9cc836",
    "photo-1603048297172-c92544798d5a",
  ],
  postre: [
    "photo-1571115177098-24ec42ed204d",
    "photo-1533134242443-d4fd215305ad",
    "photo-1578985545062-69928b1d9587",
    "photo-1551024709-8f23befc6f87",
    "photo-1488477181946-6428a0291777",
    "photo-1563729784474-d77dbb933a9e",
    "photo-1464349095431-e9a21285b5f3",
    "photo-1563805042-7684c019e1cb",
    "photo-1565958011703-44f9829ba187",
    "photo-1551024506-0bccd828d307",
  ],
  refresco: [
    "photo-1548839140-29a749e1cf4d",
    "photo-1600271886742-f049cd451bba",
    "photo-1554866585-cd94860890b7",
    "photo-1629203851122-3726ecdf080e",
    "photo-1624517452488-04869289c4ca",
    "photo-1613478223719-2ab802602423",
    "photo-1625772299848-391b6a87d7b3",
  ],
  general: [
    "photo-1514933651103-005eec06c04b",
    "photo-1551218808-94e220e084d2",
    "photo-1414235077428-338989a2e8c0",
    "photo-1555396273-367ea4eb4db5",
    "photo-1517248135467-4c7edcad34c4",
    "photo-1466978913421-dad2ebd01d17",
    "photo-1550966871-3ed3cdb5ed0c",
    "photo-1481833761820-0509d3217039",
    "photo-1424847651672-bf20a4b0982b",
    "photo-1528735602780-2552fd46c7af",
    "photo-1547592166-23ac45744acd",
    "photo-1476224203421-9ac39bcb3327",
    "photo-1482049016688-2d3e1b311543",
    "photo-1512621776951-a57141f2eefd",
    "photo-1540189549336-e6e99c3679fe",
    "photo-1546069901-ba9599a7e63c",
  ],
};

function pickCategory(nombre, categoria) {
  const n = nombre.toLowerCase();
  const c = (categoria || "").toLowerCase();
  if (n.includes("hamburg")) return "burger";
  if (n.includes("tostada") || n.includes("tosticarne") || n.includes("taco") || n.includes("torta ahogada")) return "taco";
  if (n.includes("papa")) return "papa";
  if (n.includes("alita")) return "alitas";
  if (n.includes("aguachile") || n.includes("camar") || n.includes("trompa") || n.includes("tostada") || n.includes("pa picar") || n.includes("pulpo") || n.includes("ostion") || n.includes("ceviche") || n.includes("atún") || n.includes("tuna") || n.includes("salm") || n.includes("robalo") || n.includes("mojarra") || n.includes("filete")) return "marisco";
  if (n.includes("café") || n.includes("cafe") || n.includes("canela") || n.includes("capuchino") || n.includes("espresso") || n.includes("americano")) return "cafe";
  if (n.includes("paloma") || n.includes("mojito") || n.includes("vampiro") || n.includes("piña colada") || n.includes("pinacolada") || n.includes("crajillo") || n.includes("margarita") || n.includes("cervecita") || n.includes("sangrita")) return "coctel";
  if (n.includes("vino") || n.includes("cabernet") || n.includes("merlot") || n.includes("chardonnay") || n.includes("sauvignon")) return "vino";
  if (n.includes("cerveza") || n.includes("corona") || n.includes("victoria") || n.includes("michelada") || n.includes("chelada") || n.includes("mixtelada") || n.includes("preparado") || n.includes("micheloza") || n.includes("modelo") || n.includes("diana") || n.includes("bohemia") || n.includes("indio") || n.includes("pacifico") || n.includes("negra modelo")) return "cerveza";
  if (n.includes("shot") || n.includes("destilado") || n.includes("mezcal") || n.includes("tequila") || n.includes("licor") || n.includes("baileys") || n.includes("whisky") || n.includes("red label") || n.includes("black & white") || n.includes("black and white") || n.includes("jim beam") || n.includes("captain morgan") || n.includes("bacard") || n.includes("smirnoff") || n.includes("don julio") || n.includes("patr") || n.includes("centenario") || n.includes("cuervo") || n.includes("maestro dobel") || n.includes("don ram") || n.includes("viznaga") || n.includes("43") || n.includes("crema de mezcal") || n.includes("cata")) return "destilado";
  if (n.includes("bistec") || n.includes("rib") || n.includes("new york") || n.includes("arrachera") || n.includes("punta") || n.includes("tenderloin") || n.includes("filete") || n.includes("carne") || n.includes("costilla")) return "carne";
  if (n.includes("postre") || n.includes("cake") || n.includes("cheesecake") || n.includes("pie") || n.includes("tarta") || n.includes("helado") || n.includes("brownie") || n.includes("flan") || n.includes("churro") || n.includes("galleta")) return "postre";
  if (n.includes("refresco") || n.includes("coca") || n.includes("pepsi") || n.includes("sprite") || n.includes("mirinda") || n.includes("manzanita") || n.includes("seven") || n.includes("agua") || n.includes("jumex") || n.includes("jug") || n.includes("horchata") || n.includes("jamaica") || n.includes("limonada") || n.includes("tamarindo") || n.includes("sidra")) return "refresco";
  if (c.includes("cocina") || c.includes("marisc") || c.includes("corte")) return "general";
  return "general";
}

// Assign unique images
const used = new Set();
const cursors = {};
function nextFrom(cat) {
  if (!cursors[cat]) cursors[cat] = 0;
  const arr = POOL[cat] || POOL.general;
  // find first unused in this category, wrapping
  for (let i = 0; i < arr.length; i++) {
    const idx = (cursors[cat] + i) % arr.length;
    const id = arr[idx];
    if (!used.has(id)) {
      cursors[cat] = idx + 1;
      used.add(id);
      return Q(id);
    }
  }
  // fallback: any unused from general
  for (const id of POOL.general) {
    if (!used.has(id)) {
      used.add(id);
      return Q(id);
    }
  }
  // last resort: append a unique suffix (still unique URL)
  const fallback = `photo-fallback-${used.size}`;
  used.add(fallback);
  return `https://images.unsplash.com/${fallback}?w=400&h=400&fit=crop`;
}

// Products that already have a correct unique image can keep it if we mark them
// Simpler: reassign ALL to guarantee uniqueness
const changes = [];
for (const p of menu.productos) {
  const cat = pickCategory(p.nombre, p.categoria);
  const nueva = nextFrom(cat);
  if (p.imagen !== nueva) {
    changes.push({ nombre: p.nombre, antes: p.imagen, despues: nueva });
  }
  p.imagen = nueva;
}

// Verify uniqueness
const urls = menu.productos.map((p) => p.imagen);
const unique = new Set(urls);
console.log(`Productos: ${menu.productos.length}`);
console.log(`URLs únicas: ${unique.size}`);
console.log(`Cambios: ${changes.length}`);

if (unique.size !== menu.productos.length) {
  console.error("ERROR: hay URLs duplicadas");
  process.exit(1);
}

writeFileSync(jsonPath, JSON.stringify(menu, null, 2) + "\n", "utf8");
console.log("menu-nuevo.json actualizado");

// Also write mapping for Firestore update
writeFileSync(
  join(aqui, "product-image-map.json"),
  JSON.stringify(
    menu.productos.map((p) => ({ nombre: p.nombre, imagen: p.imagen })),
    null,
    2
  ) + "\n",
  "utf8"
);
console.log("product-image-map.json escrito");
