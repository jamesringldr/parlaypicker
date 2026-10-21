"use client";

import { Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { makePick } from "@/app/games/actions";

// The player's own unlocked pick: an Edit button that opens the pick with a trash can to delete it and an
// Update pick button that goes to the Board to choose a different line.
export function EditPick({ label, detail, price, trigger = "Edit", className = "btn !py-1.5" }: { label: string; detail?: string; price?: string; trigger?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const remove = () =>
    start(async () => {
      const data = new FormData();
      data.set("intent", "remove");
      const result = await makePick({}, data);
      if (result.error) setError(result.error);
      else close();
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pick-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
          >
            <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:text-zinc-100">
              <X className="size-5" aria-hidden />
            </button>
            <h2 id="edit-pick-title" className="text-xl font-bold">
              Your pick
            </h2>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-zinc-800 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {label}
                  {price && <span className="ml-2 text-sm font-normal text-zinc-400">{price}</span>}
                </p>
                {detail && <p className="truncate text-xs text-zinc-400">{detail}</p>}
              </div>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                aria-label="Delete pick"
                className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-zinc-700 hover:text-red-400 disabled:opacity-50"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <Link href="/games" className="btn mt-5 w-full !py-2.5">
              Update pick
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
