"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const UNITS = ["Days", "Hrs", "Min", "Sec"] as const;

function countdown(ms: number): string[] {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts = [Math.floor(total / 86400), Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60];
  return parts.map((n) => String(n).padStart(2, "0"));
}

// Shown once when a page loads for a player who hasn't picked yet, on any page but the Board. Moving around
// the site afterwards doesn't bring it back; a reload or a new visit does.
export function PickReminder({ deadline, serverNow }: { deadline: number; serverNow: number }) {
  const pathname = usePathname();
  // Decided on the first render, so it's the same on the server and in the browser.
  const [open, setOpen] = useState(() => !pathname.startsWith("/games") && !pathname.startsWith("/login"));
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const left = deadline - now;
  const close = () => setOpen(false);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-reminder-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center shadow-xl"
      >
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:text-zinc-100">
          <X className="size-5" aria-hidden />
        </button>
        <h2 id="pick-reminder-title" className="text-xl font-bold">
          Your pick is missing
        </h2>
        {left > 0 ? (
          <>
            <p className="mt-4 flex justify-center gap-2 text-3xl font-bold tabular-nums text-red-400" aria-label="Time left to make your pick">
              {countdown(left).map((n, i) => (
                <span key={UNITS[i]} className="flex flex-col items-center">
                  <span>{n}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{UNITS[i]}</span>
                </span>
              ))}
            </p>
            <p className="mt-1 text-sm text-zinc-400">to make your pick</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-red-400">The deadline has passed. Make your pick now.</p>
        )}
        <div className="mt-6 flex gap-3">
          <Link href="/bet-slip" onClick={close} className="btn-ghost flex-1 !py-2.5">
            Bet Slip
          </Link>
          <Link href="/games" onClick={close} className="btn flex-1 !py-2.5">
            Make Pick
          </Link>
        </div>
      </div>
    </div>
  );
}
