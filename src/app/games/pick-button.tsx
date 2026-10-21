"use client";

import { useActionState } from "react";
import { makePick, type PickResult } from "./actions";

export type PickState = "open" | "mine" | "taken" | "locked";

// One tappable line. Tapping makes it the player's pick; tapping their own pick takes it back.
export function PickButton({
  fields,
  state,
  title,
  className,
  children,
}: {
  fields: Record<string, string>;
  state: PickState;
  title?: string;
  className: string;
  children: React.ReactNode;
}) {
  const [result, action, pending] = useActionState<PickResult, FormData>(makePick, {});
  const ring =
    state === "mine"
      ? "ring-2 ring-emerald-500"
      : state === "taken"
        ? "opacity-40"
        : state === "open"
          ? "hover:ring-2 hover:ring-zinc-500"
          : "";
  return (
    <form action={action} className={`relative ${className}`}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state === "mine" && <input type="hidden" name="intent" value="remove" />}
      <button
        type="submit"
        disabled={pending || state === "taken" || state === "locked"}
        title={title}
        aria-pressed={state === "mine"}
        className={`block w-full rounded-lg ${ring} ${pending ? "opacity-60" : ""} disabled:cursor-not-allowed`}
      >
        {children}
      </button>
      {result.error && (
        <p role="alert" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg bg-red-950 p-2 text-xs text-red-200 shadow-lg">
          {result.error}
        </p>
      )}
    </form>
  );
}
