"use client";

import Image from "next/image";
import Link from "next/link";
import { useRestaurantePublico } from "@/hooks/useRestaurantePublico";
import { RESTAURANTE_DEFECTO } from "@/lib/restaurantes";

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
  const { rid, slug, nombre, listo, config } = useRestaurantePublico();
  const esDefecto = rid === RESTAURANTE_DEFECTO;
  const hero = config.hero || (esDefecto ? "/menu/hero.jpg" : "");
  const logo = config.logo || (esDefecto ? "/menu/logo.png" : "");
  const frase = config.frase || (esDefecto ? "Donde la historia y la comida se fusionan." : "");
  const urlPedido = `/pedido-casa?r=${encodeURIComponent(slug || rid)}`;

  if (!listo) {
    return (
      <div className="min-h-screen bg-[#1a1410] text-[#f0e2c4] flex items-center justify-center">
        Cargando menú…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1410] text-[#f0e2c4]">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          {hero && (
            <Image
              src={hero}
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover object-center"
            />
          )}
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="inline-block mb-6">
            {logo ? (
              <Image
                src={logo}
                alt={nombre}
                width={280}
                height={244}
                priority
                unoptimized
                className="w-48 sm:w-64 h-auto mx-auto drop-shadow-2xl"
              />
            ) : (
              <p className="text-2xl font-bold">{nombre}</p>
            )}
          </div>
          {frase && (
            <h1 className="font-serif text-3xl sm:text-4xl tracking-wide text-[#f0e2c4]">
              {frase}
            </h1>
          )}
          <div className="mt-8 flex flex-col items-center gap-3">
            {(config.instagram || config.facebook) && (
              <p className="font-serif text-xl sm:text-2xl">¡Síguenos en redes!</p>
            )}
            <div className="flex items-center gap-5">
              {config.instagram && (
                <a
                  href={config.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image src="/menu/instagram.png" alt="Instagram" width={48} height={48} />
                </a>
              )}
              {config.facebook && (
                <a
                  href={config.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image src="/menu/facebook.png" alt="Facebook" width={48} height={48} />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {esDefecto ? (
          PAGINAS.map((p, i) => (
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
          ))
        ) : (
          <div className="rounded-lg bg-black/30 ring-1 ring-white/10 p-6 text-center">
            <p className="font-serif text-lg mb-3">Menú de {nombre}</p>
            <p className="text-sm text-[#f0e2c4]/70 mb-4">
              Consulta platillos, precios y haz tu pedido desde el menú de este restaurante.
            </p>
            <Link
              href={urlPedido}
              className="inline-block bg-amber-800 text-white px-6 py-3 rounded-xl font-bold"
            >
              Ver menú y pedir
            </Link>
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-10 text-center space-y-4">
        <p className="text-xs text-[#f0e2c4]/50 pt-4">
          {nombre}
        </p>
      </footer>
    </div>
  );
}
