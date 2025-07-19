import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FSK Online - Fiskelogistikgruppen Dashboard",
  description: "Privat forretningsdashboard for Fiskelogistikgruppen - Sikker adgang til forretningsdata og logistikstyring",
  keywords: ["fiskelogistik", "dashboard", "privat", "admin", "logistik", "fiskeri"],
  authors: [{ name: "Fiskelogistikgruppen" }],
  robots: "noindex, nofollow", // Forhindrer søgemaskiner i at indeksere siden
  icons: {
    icon: "/fiskelogistikgruppen-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
