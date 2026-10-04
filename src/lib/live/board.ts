import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { Leg } from "./grade";

const BOARD_ID = "current";

// The page URL is /live/<LIVE_SLUG>. Unlisted, not secret-grade: anyone with the link can view.
export function isViewSlug(slug: string) {
  return !!process.env.LIVE_SLUG && slug === process.env.LIVE_SLUG;
}

// Editing needs LIVE_ADMIN_KEY as well.
export function isAdminKey(key: string | undefined) {
  const expected = process.env.LIVE_ADMIN_KEY;
  if (!expected || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getLegs(): Promise<Leg[]> {
  const { data, error } = await createAdminClient()
    .from("live_board")
    .select("legs")
    .eq("id", BOARD_ID)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the board: ${error.message}`);
  return (data?.legs as Leg[] | undefined) ?? [];
}

export async function saveLegs(legs: Leg[]) {
  const { error } = await createAdminClient()
    .from("live_board")
    .upsert({ id: BOARD_ID, legs, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Couldn't save the board: ${error.message}`);
}
