// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppHeader, MobileNav } from "@/components/app-shell";
import { CommandSearchProvider } from "@/components/command-search";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { WatchlistProvider } from "@/components/watchlist-provider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Anitrack",
  description: "Suche Anime, verwalte deine Watchlist, entdecke saisonale Neuheiten und erhalte KI-Empfehlungen.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            <WatchlistProvider>
              <CommandSearchProvider>
                <AppHeader />
                <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 md:pb-16">{children}</main>
                <MobileNav />
              </CommandSearchProvider>
            </WatchlistProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}