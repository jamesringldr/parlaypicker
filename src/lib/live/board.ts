import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { gradeLeg, legKey, legScore, type Grade, type Leg, type Manual } from "./grade";
import { getScores } from "./scores";

const BOARD_ID = "current";

// Unlisted, not secret: anyone who knows this path can view the board.
export const LIVE_PATH = "/live-board";

// Editing needs LIVE_ADMIN_KEY as well.
export function isAdminKey(key: string | undefined) {
  const expected = process.env.LIVE_ADMIN_KEY;
  if (!expected || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getBoard(): Promise<{ legs: Leg[]; totalPrice: number | null }> {
  const { data, error } = await createAdminClient()
    .from("live_board")
    .select("legs, total_price")
    .eq("id", BOARD_ID)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the board: ${error.message}`);
  return { legs: (data?.legs as Leg[] | undefined) ?? [], totalPrice: data?.total_price ?? null };
}

export async function getLegs(): Promise<Leg[]> {
  return (await getBoard()).legs;
}

export async function saveLegs(legs: Leg[]) {
  const { error } = await createAdminClient()
    .from("live_board")
    .upsert({ id: BOARD_ID, legs, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Couldn't save the board: ${error.message}`);
}

// A leg frozen at archive time, with how it ended.
export type ArchivedLeg = Leg & { result: Manual; detail: string };

export interface PastWeek {
  id: string;
  weekNumber: number;
  weekOf: string; // YYYY-MM-DD
  legs: ArchivedLeg[];
  totalPrice: number | null;
}

const centralDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" });

// Freezes the current board into the archive and clears it. Returns an error message if any leg
// hasn't settled, because an archived leg can't be graded later.
export async function archiveBoard(): Promise<string | null> {
  const { legs, totalPrice } = await getBoard();
  if (legs.length === 0) return "The board is empty.";

  const { scores, boxes } = await getScores(legs);
  const grades: Grade[] = legs.map((leg) =>
    gradeLeg(leg, legScore(leg, scores), boxes.get(legKey(leg))),
  );
  const open = grades.filter((g) => g.state !== "hit" && g.state !== "miss" && g.state !== "push").length;
  if (open > 0) return `${open} leg${open === 1 ? " hasn't" : "s haven't"} settled yet. Mark ${open === 1 ? "it" : "them"} by hand first.`;

  const frozen = legs.map((leg, i) => ({ ...leg, result: grades[i].state as Manual, detail: grades[i].detail }));
  const kickoffs = legs.flatMap((l) => (l.commenceTime ? [l.commenceTime] : [])).sort();
  const weekOf = centralDate.format(new Date(kickoffs[0] ?? Date.now()));

  const db = createAdminClient();
  const { data: last } = await db
    .from("live_board_weeks")
    .select("week_number")
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db
    .from("live_board_weeks")
    .insert({ week_number: (last?.week_number ?? 0) + 1, week_of: weekOf, legs: frozen, total_price: totalPrice });
  if (error) return `Couldn't archive the board: ${error.message}`;
  const { error: clearError } = await db
    .from("live_board")
    .upsert({ id: BOARD_ID, legs: [], total_price: null, updated_at: new Date().toISOString() });
  if (clearError) return `Archived, but couldn't clear the board: ${clearError.message}`;
  return null;
}

export async function getPastWeeks(): Promise<PastWeek[]> {
  const { data, error } = await createAdminClient()
    .from("live_board_weeks")
    .select("id, week_number, week_of, legs, total_price")
    .order("week_number", { ascending: false });
  if (error) throw new Error(`Couldn't load past weeks: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    weekNumber: r.week_number,
    weekOf: r.week_of,
    legs: r.legs as ArchivedLeg[],
    totalPrice: r.total_price,
  }));
}
