import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PronoMaster - L'IA au service de vos pronostics",
  description: "PronoMaster, l'application ultime de pronostics sportifs alimentée par l'Intelligence Artificielle.",
  manifest: "/manifest.json",
  icons: {
    icon: "/img/favicon.png",
    apple: "/img/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PronoMaster",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overscroll-y-contain">
        <main className="flex-1">{children}</main>
        <BottomNav />
        {/* Pull-to-refresh : bouton de synchronisation rapide avec Supabase */}
        <div
          id="pull-to-refresh-indicator"
          className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white text-center py-2 text-xs font-bold -translate-y-full transition-transform duration-300 opacity-0"
        >
          ↻ Synchronisation...
        </div>
      </body>
    </html>
  );
}
