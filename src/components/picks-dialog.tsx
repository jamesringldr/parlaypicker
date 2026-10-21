"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";

export interface PickRow {
  slug: string;
  name: string;
  photoUrl: string | null;
  // Their emojis for the week's scorers and best and worst picks.
  corner?: string;
  award?: string;
  label: string;
  detail?: string;
  price?: string;
}

// The Lines tab's top-right button: how many players have picked, and a tap lists the picks made so far.
export function PicksDialog({ rows, total }: { rows: PickRow[]; total: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn shrink-0">
        Bet Slip · {rows.length} of {total}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="picks-title"
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:text-zinc-100"
            >
              <X className="size-5" aria-hidden />
            </button>
            <h2 id="picks-title" className="text-xl font-bold">
              Bet Slip
            </h2>
            <p className="text-sm text-zinc-400">
              {rows.length} of {total} picked
            </p>
            {rows.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-400">No Legs Picked Yet</p>
            ) : (
              <ul className="mt-3 overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.slug} className="flex items-center gap-3 border-b border-zinc-800 py-3 last:border-b-0">
                    <Avatar name={r.name} photoUrl={r.photoUrl} className="size-10 text-base" corner={r.corner} award={r.award} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.name}</p>
                      <p className="truncate text-sm text-zinc-200">
                        {r.label}
                        {r.price && <span className="ml-2 text-zinc-500">{r.price}</span>}
                      </p>
                      {r.detail && <p className="truncate text-xs text-zinc-500">{r.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
