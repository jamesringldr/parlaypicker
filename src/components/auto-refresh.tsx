"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the server page on a timer so scores stay current. Idle while the tab is hidden.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
