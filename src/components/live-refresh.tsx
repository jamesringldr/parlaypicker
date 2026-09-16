"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Re-renders the page when anyone adds or removes a pick or the admin changes the parlay.
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("parlay")
      .on("postgres_changes", { event: "*", schema: "public", table: "picks" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "parlays" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
