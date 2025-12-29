"use client";

import type React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, Suspense } from "react"; // Added Suspense
import { toast } from "sonner";
import { ThemeProvider } from "@/components/helpers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import SessionWrapper from "@/components/helpers/SessionWrapper";
import Navbar from "../home/Navbar";
import MobileNav from "@/components/home/mobile-nav";
import DashboardSidebar from "../admin/dashboard-sidebar";
import DashboardMobileNav from "../admin/dashboard-mobile-nav";
import { initializeAccessibility } from "@/lib/accessibility";

function SearchParamHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error === "unauthorized_admin") {
      toast.error("Access Denied", {
        description: "You do not have permission to access that page.",
        duration: 5000,
      });

      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("error");
      router.replace(pathname + (newParams.toString() ? `?${newParams.toString()}` : ""));
    }
  }, [searchParams, pathname, router]);

  return null;
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith("/dashboard");

  useEffect(() => {
    initializeAccessibility({
      skipToContent: true,
      focusManagement: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
    });
  }, []);

  return (
    <SessionWrapper>
      <ThemeProvider>
        <Suspense fallback={null}>
          <SearchParamHandler />
        </Suspense>

        {!isDashboardRoute && <Navbar />}

        {isDashboardRoute && <DashboardSidebar />}

        <main
          className={`main-content ${isDashboardRoute ? "md:pl-64" : ""}`}
        >
          {children}
        </main>

        {isDashboardRoute ? <DashboardMobileNav /> : <MobileNav />}

        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </SessionWrapper>
  );
}