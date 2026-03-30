import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "COERIMAR — Gestión de Mantenimiento",
  description:
    "Sistema de gestión de mantenimiento de embarcaciones pesqueras — Procesos de Mantenimiento y Diagramas de Gantt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable}`}>
      <body className="antialiased min-h-screen font-sans">
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
