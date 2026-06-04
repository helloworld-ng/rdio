import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_SIDEBAR_QUERY, SIDEBAR_STORAGE_KEY } from "@/lib/constants";

function readInitialSidebarVisible() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const savedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (savedValue === "true") {
      return true;
    }

    if (savedValue === "false") {
      return false;
    }
  } catch {
    // Storage can be unavailable in private contexts; fall back to viewport defaults.
  }

  return !window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;
}

/** Keeps sidebar visibility responsive while preserving the user's preference. */
export function useResponsiveSidebar() {
  const isMobileSidebar = useMediaQuery(MOBILE_SIDEBAR_QUERY);
  const [isSidebarVisible, setIsSidebarVisible] = useState(
    readInitialSidebarVisible
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(isSidebarVisible)
      );
    } catch {
      // Ignore unavailable local storage.
    }
  }, [isSidebarVisible]);

  return { isMobileSidebar, isSidebarVisible, setIsSidebarVisible };
}
