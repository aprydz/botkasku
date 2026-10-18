import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { 
  title: "Kasku — Catatan Keuangan Modern & WA Sync", 
  description: "Dashboard keuangan pintar dengan sinkronisasi WhatsApp otomatis dan analitik realtime." 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased font-[var(--font-inter)] selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
