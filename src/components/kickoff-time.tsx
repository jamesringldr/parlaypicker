"use client";

import { useEffect, useState } from "react";
import { kickoffLabel } from "@/lib/live/kickoff";

// Ticks every second so the last five minutes before kickoff can count down on screen. The
// first render uses the server's clock so it matches the server-rendered HTML.
export function KickoffTime({
  kickoff,
  scheduled,
  live,
  final,
  renderedAt,
}: {
  kickoff: string;
  scheduled: string;
  live?: string;
  final: boolean;
  renderedAt: number;
}) {
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <>{kickoffLabel({ now, kickoff: new Date(kickoff).getTime(), scheduled, live, final })}</>;
}
