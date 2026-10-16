"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { isPropTab, PROP_TABS, type PropTab } from "@/lib/odds/props";

const TABS = Object.keys(PROP_TABS) as PropTab[];

// The prop type picker. With a player's card open nothing is "current", so it shows a placeholder
// and any pick, even the one you were on, takes you back to that list.
export function PropSelect({ prop, playerOpen }: { prop: PropTab; playerOpen: boolean }) {
  const router = useRouter();

  return (
    <div className="relative shrink-0">
      <select
        aria-label="Prop type"
        value={playerOpen ? "" : prop}
        onChange={(e) => {
          if (isPropTab(e.target.value)) router.push(`/games?tab=props&view=players&prop=${e.target.value}`, { scroll: false });
        }}
        className="input w-auto cursor-pointer appearance-none !pr-8 font-semibold"
      >
        {playerOpen && (
          <option value="" disabled>
            Prop type
          </option>
        )}
        {TABS.map((t) => (
          <option key={t} value={t}>
            {PROP_TABS[t].label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
    </div>
  );
}
