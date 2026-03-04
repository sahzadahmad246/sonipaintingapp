"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SITE_NAME } from "@/lib/brand";

export function useSiteName() {
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME);

  useEffect(() => {
    let isMounted = true;

    const fetchSiteName = async () => {
      try {
        const response = await fetch("/api/general-info");
        if (!response.ok) return;

        const data = await response.json();
        if (isMounted && data?.siteName) {
          setSiteName(data.siteName);
        }
      } catch {
        // Keep fallback brand name when API is unavailable.
      }
    };

    fetchSiteName();

    return () => {
      isMounted = false;
    };
  }, []);

  return siteName;
}
