import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AlacakAI — Yapay Zeka Destekli Alacak Takip",
  description:
    "KOBİ'ler için yapay zeka destekli otonom alacak takip ve nakit akış yönetim sistemi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/*
         * Tema sınıfı (`light` / `dark`) hydration'dan önce <html>'e konulmalı,
         * yoksa kullanıcı sayfa yüklenirken yanlış tema rengiyle 1 frame görür.
         * Bu inline script localStorage'ı okuyup class'ı set eder — React
         * hydrate olduğunda sınıf zaten yerinde, ThemeProvider sadece
         * doğrulama yapar.
         */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
