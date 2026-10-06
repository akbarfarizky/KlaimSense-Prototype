import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KlaimSense — BPJS Kesehatan Verification Intelligence",
  description:
    "Prototype verifikasi klaim BPJS Kesehatan: kapasitas, kewajaran, duplikasi, dan pola peer. Data sintetis untuk Healthkathon 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
