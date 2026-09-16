import "server-only";
import { redirect } from "next/navigation";

export function fail(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

// Turns database rule violations into messages people can act on.
export function dbErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "P0001") return error.message;
  if (error.message.includes("picks_one_per_picker")) return "You already have a pick on this parlay.";
  if (error.message.includes("picks_no_conflict"))
    return "Someone already picked that, or the other side of it. Choose a different leg.";
  if (error.message.includes("parlays_one_open")) return "Lock the current parlay before opening another.";
  return "Something went wrong. Try again.";
}
