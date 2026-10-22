export default function manifest() {
  return {
    name: "ShopQR - Pedidos",
    short_name: "ShopQR",
    description: "Menú y pedidos del restaurante",
    start_url: "/pedido-casa",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#e11d48",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
