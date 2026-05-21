import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/design/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.subtitle,
  metadataBase: new URL("https://goalpressure.com.br"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${rajdhani.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-[var(--gp-white)] text-[var(--text)]">
        {children}
      </body>
    </html>
  );
}
