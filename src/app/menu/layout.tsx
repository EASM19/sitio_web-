import type { Metadata } from "next";
import type { ReactNode } from "react";

export default function MenuLayout({ children }: { children: ReactNode }) {
  return children;
}

export const metadata: Metadata = {
  title: "Menú",
  description: "Menú y redes sociales del restaurante.",
};
