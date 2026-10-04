import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { Leg } from "./grade";

const BOARD_ID = "current";

// Unlisted, not secret: anyone who knows this path can view the board.
export const LIVE_PATH = "/low-t/live-board";

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
