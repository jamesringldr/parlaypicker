"use client";

import { CalendarDays, House, Receipt, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// `me` is the signed-in player's slug. Signed out, My Legs sends them to sign in.
export function AppBar({ me }: { me: string | null }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  const tabs = [
    { label: "Home", href: "/", icon: House, active: pathname === "/" },
    { label: "Games", href: "/games", icon: CalendarDays, active: pathname.startsWith("/games") },
    { label: "Bet Slip", href: "/bet-slip", icon: Receipt, active: pathname.startsWith("/bet-slip") },
    { label: "My Legs", href: me ? `/${me}` : "/login", icon: UserRound, active: !!me && pathname === `/${me}` },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map(({ label, href, icon: Icon, active }) => (
          <li key={label} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                active ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {/* Lucide has no solid icons, so the active one is filled and its inner lines are cut out in the bar colour. */}
              <Icon className={`size-5 ${active ? "fill-current stroke-zinc-950" : ""}`} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
