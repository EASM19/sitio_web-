import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Bóveda Del Real - Menú",
  description: "Donde la historia y la comida se fusionan. Cocina, copas y mezcal.",
  openGraph: {
    title: "La Bóveda Del Real",
    description: "Donde la historia y la comida se fusionan.",
    images: ["/menu/logo.png"],
  },
};

const PAGINAS = [
  { src: "/menu/pagina-01.jpg", alt: "Portada del menú La Bóveda Del Real", w: 1280, h: 1920 },
  { src: "/menu/pagina-02.jpg", alt: "Menú de nuestra cocina: torta ahogada, hamburguesas, alitas y tostadas", w: 1280, h: 1920 },
  { src: "/menu/pagina-03.jpg", alt: "Barra fría de mariscos: aguachile, sashimi, callos de tilapia", w: 1280, h: 1656 },
  { src: "/menu/pagina-04.jpg", alt: "Postres: pay de queso, frambuesa y pastel cumpleañero", w: 1280, h: 1656 },
  { src: "/menu/pagina-05.jpg", alt: "Cortes de carne: T-bone, arrachera, New York Angus y camarones a la bóveda", w: 1280, h: 1656 },
  { src: "/menu/pagina-06.jpg", alt: "Bebidas y otros: refrescos y bebidas calientes", w: 1280, h: 1656 },
  { src: "/menu/pagina-07.jpg", alt: "Servicios: tequilas, whiskys, ron y vodka por botella", w: 1280, h: 1656 },
  { src: "/menu/pagina-08.jpg", alt: "Cata de mezcal: Casa Santa Teresa y Casa Don Antonio Briones", w: 1280, h: 1656 },
  { src: "/menu/pagina-09.jpg", alt: "Bebidas preparadas: paloma, vampiro, mojitos y conbinados", w: 1280, h: 1656 },
  { src: "/menu/pagina-10.jpg", alt: "Vinos, cervezas, shots, destilados preparados y digestivos", w: 1280, h: 1656 },
];

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-[#1a1410] text-[#f0e2c4]">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/menu/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="inline-block mb-6">
            <Image
              src="/menu/logo.png"
              alt="La Bóveda Del Real"
              width={280}
              height={244}
              priority
              className="w-48 sm:w-64 h-auto mx-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-wide text-[#f0e2c4]">
            Donde la historia y la comida se fusionan.
          </h1>
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="font-serif text-xl sm:text-2xl">¡Síguenos en redes!</p>
            <div className="flex items-center gap-5">
              <a
                href="https://www.instagram.com/labovedadelreal"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:opacity-80 transition-opacity"
              >
                <Image src="/menu/instagram.png" alt="Instagram" width={48} height={48} />
              </a>
              <a
                href="https://www.facebook.com/share/1BzRuv79S6/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="hover:opacity-80 transition-opacity"
              >
                <Image src="/menu/facebook.png" alt="Facebook" width={48} height={48} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 bg-[#2b1d12]/95 backdrop-blur border-b-4 border-[#a67c3d] shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm sm:text-base text-[#f0e2c4]/80 hover:text-[#f0e2c4] font-medium"
          >
            ← Menú digital
          </Link>
          <Link
            href="/pedido-casa"
            className="bg-[#a67c3d] hover:bg-[#8b6529] text-white text-sm sm:text-base font-bold px-5 py-2.5 rounded-xl shadow"
          >
            Ordenar en línea
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {PAGINAS.map((p, i) => (
          <div
            key={p.src}
            className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-black/40 bg-black"
          >
            <Image
              src={p.src}
              alt={p.alt}
              width={p.w}
              height={p.h}
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 768px"
              className="w-full h-auto"
            />
          </div>
        ))}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-10 text-center space-y-4">
        <p className="font-serif text-lg text-[#f0e2c4]/90">
          ¿Listo para ordenar?
        </p>
        <Link
          href="/pedido-casa"
          className="inline-block bg-[#a67c3d] hover:bg-[#8b6529] text-white font-bold px-8 py-3.5 rounded-xl shadow-lg text-lg"
        >
          Ordenar en línea
        </Link>
        <p className="text-xs text-[#f0e2c4]/50 pt-4">
          Cocina · Copas · Mezcal
        </p>
      </footer>
    </div>
  );
}
