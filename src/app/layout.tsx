import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/home/Navbar";
import MobileNav from "@/components/home/mobile-nav";

import { Toaster } from "@/components/ui/sonner";
import SessionWrapper from "@/components/helpers/SessionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PaintPro - Interior Contractor",
  description: "Interior painting, POP, carpentry, and tiling services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionWrapper>
          
            <Navbar />
            <main>{children}</main>
            <MobileNav />
            <Toaster position="top-right" richColors />
          
        </SessionWrapper>
      </body>
    </html>
  );
}
