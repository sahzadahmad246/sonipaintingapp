"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/helpers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import SessionWrapper from "@/components/helpers/SessionWrapper";
import Navbar from "../home/Navbar";
import MobileNav from "@/components/home/mobile-nav";
import DashboardSidebar from "../admin/dashboard-sidebar";
import DashboardMobileNav from "../admin/dashboard-mobile-nav";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith("/dashboard");

  return (
    <SessionWrapper>
      <ThemeProvider>
        {/* Show Navbar on non-dashboard routes */}
        {!isDashboardRoute && <Navbar />}

        {/* Show Dashboard Sidebar on dashboard routes (desktop only) */}
        {isDashboardRoute && <DashboardSidebar />}

        <main
          className={`main-content ${isDashboardRoute ? "md:pl-64" : ""}`}
        >
          {children}
        </main>

        {/* Show appropriate mobile navigation based on route */}
        {isDashboardRoute ? <DashboardMobileNav /> : <MobileNav />}

        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </SessionWrapper>
  );
}