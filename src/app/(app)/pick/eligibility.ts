import "server-only";
import { redirect } from "next/navigation";
import { getCurrentParlay, getViewer } from "@/lib/data";

// Sends anyone who can't pick right now back to the parlay page.
export async function requirePicker() {
  const [viewer, current] = await Promise.all([getViewer(), getCurrentParlay()]);
  if (
    !current ||
    current.parlay.status !== "open" ||
    !viewer.is_member ||
    viewer.id === current.parlay.better_id ||
    current.picks.some((p) => p.picker_id === viewer.id)
  ) {
    redirect("/");
  }
  return { viewer, ...current };
}
