"use client";

import { ThemeProvider } from "@/components/helpers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import SessionWrapper from "@/components/helpers/SessionWrapper";
import Navbar from "@/components/home/Navbar";
import MobileNav from "@/components/home/mobile-nav";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionWrapper>
      <ThemeProvider>
        <Navbar />
        <main>{children}</main>
        <MobileNav />
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </SessionWrapper>
  );
}