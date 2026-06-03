import type { Metadata } from "next";
import { Inter, Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Integra&Co Financeiro",
  description: "Sistema de gestão financeira premium para escritórios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-[#0E0E0E] text-[#F0EDE8] antialiased">
        {children}
      </body>
    </html>
  );
}
