import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getBoard, saveLegs } from "@/lib/live/board";
import { getRole, type Role } from "@/lib/live/activity-store";
import type { Leg } from "@/lib/live/grade";
import { pickDeadline } from "./deadline";
import { contradicts, factsOfLeg, lineIdOfLeg, type OtherPick } from "./legs";
import { playerBySlug } from "@/lib/players";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

export interface SlipPick {
  slug: string;
  leg: Leg;
  conflictKey: string;
}

// The board's week is the one after the last archived week.
export async function currentWeek(): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("live_board_weeks")
    .select("week_number")
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the week: ${error.message}`);
  return (data?.week_number ?? 0) + 1;
}

// Picks are open until an admin finalizes the slip. A week whose legs were typed straight onto the
// board (before there was a draft) counts as final too.
export async function isDrafting(week: number): Promise<boolean> {
  const db = createAdminClient();
  const [row, board] = await Promise.all([
    db.from("slip_weeks").select("week_number").eq("week_number", week).maybeSingle(),
    getBoard(),
  ]);
  if (row.error) throw new Error(`Couldn't load the slip: ${row.error.message}`);
  return !row.data && board.legs.length === 0;
}

export async function getPicks(week: number): Promise<SlipPick[]> {
  const { data, error } = await createAdminClient()
    .from("slip_picks")
    .select("slug, leg, conflict_key")
    .eq("week_number", week);
  if (error) throw new Error(`Couldn't load the picks: ${error.message}`);
  return data.map((r) => ({ slug: r.slug as string, leg: r.leg as Leg, conflictKey: r.conflict_key as string }));
}

// Saves or replaces a player's pick. Returns a message when it can't be saved.
export async function savePick(week: number, slug: string, leg: Leg, conflictKey: string): Promise<string | null> {
  if (!(await isDrafting(week))) return "This week's slip is final.";
  const picks = await getPicks(week);
  const clash = picks.find((p) => p.slug !== slug && p.conflictKey === conflictKey);
  if (clash) return `${playerBySlug(clash.slug)?.name ?? "Someone"} already has that bet, or the other side of it.`;

  const contradiction = picks.find((p) => p.slug !== slug && contradicts(factsOfLeg(p.leg), factsOfLeg(leg)));
  if (contradiction) return `${playerBySlug(contradiction.slug)?.name ?? "Someone"}'s pick (${contradiction.leg.label}) rules that one out.`;

  const mine = picks.find((p) => p.slug === slug);
  if (mine && startedAlready(mine.leg)) return "Your current pick's game has started, so it can't be changed.";

  const { error } = await createAdminClient()
    .from("slip_picks")
    .upsert({ week_number: week, slug, leg, conflict_key: conflictKey, updated_at: new Date().toISOString() });
  // The unique constraint catches two players taking the same bet at the same moment.
  if (error?.code === "23505") return "Someone just took that bet, or the other side of it.";
  if (error) throw new Error(`Couldn't save the pick: ${error.message}`);
  return null;
}

export async function clearPick(week: number, slug: string): Promise<string | null> {
  if (!(await isDrafting(week))) return "This week's slip is final.";
  const mine = (await getPicks(week)).find((p) => p.slug === slug);
  if (mine && startedAlready(mine.leg)) return "Your pick's game has started, so it can't be changed.";
  const { error } = await createAdminClient().from("slip_picks").delete().eq("week_number", week).eq("slug", slug);
  if (error) throw new Error(`Couldn't remove the pick: ${error.message}`);
  return null;
}

const startedAlready = (leg: Leg) => !!leg.commenceTime && new Date(leg.commenceTime).getTime() <= Date.now();

// Copies the picks onto the live board and closes the slip. Returns a message when it can't.
export async function finalizeSlip(week: number, by: string): Promise<string | null> {
  const picks = await getPicks(week);
  if (picks.length === 0) return "Nobody has picked yet.";

  const db = createAdminClient();
  // The primary key means only one finalize can win.
  const { error } = await db.from("slip_weeks").insert({ week_number: week, finalized_by: by });
  if (error?.code === "23505") return "This slip is already final.";
  if (error) throw new Error(`Couldn't finalize the slip: ${error.message}`);

  try {
    await saveLegs([...(await getBoard()).legs, ...picks.map((p) => p.leg)]);
  } catch (e) {
    await db.from("slip_weeks").delete().eq("week_number", week);
    throw e;
  }
  return null;
}

export interface Viewer {
  slug: string;
  name: string;
  role: Role | null;
}

// Who is signed in, from the PIN session. Null when nobody is.
export const getSessionViewer = cache(async (): Promise<Viewer | null> => {
  const slug = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const player = slug ? playerBySlug(slug) : undefined;
  if (!player) return null;
  return { slug: player.slug, name: player.name, role: await getRole(player.slug) };
});

export const canFinalize = (role: Role | null) => role === "bet_admin" || role === "super_admin";

export interface SlipView {
  me: string | null;
  open: boolean;
  // The signed-in player's pick.
  mine: { conflictKey: string; lineId: string } | null;
  // Everyone else's picks.
  others: OtherPick[];
}

// What the Games tab needs to mark each line, loaded once per request.
export const getSlipView = cache(async (): Promise<SlipView> => {
  const viewer = await getSessionViewer();
  const week = await currentWeek();
  const [open, picks] = await Promise.all([isDrafting(week), getPicks(week)]);
  const mine = picks.find((p) => p.slug === viewer?.slug);
  return {
    me: viewer?.slug ?? null,
    open,
    mine: mine ? { conflictKey: mine.conflictKey, lineId: lineIdOfLeg(mine.leg, mine.conflictKey) } : null,
    others: picks
      .filter((p) => p.slug !== viewer?.slug)
      .map((p) => ({ name: playerBySlug(p.slug)?.name ?? "Someone", conflictKey: p.conflictKey, facts: factsOfLeg(p.leg) })),
  };
});

// Set when the signed-in player has no pick yet and picks are still open. Never throws: this runs on every page.
export async function getPickReminder(): Promise<{ deadline: number; now: number } | null> {
  try {
    const view = await getSlipView();
    if (!view.me || !view.open || view.mine) return null;
    const now = Date.now();
    return { deadline: pickDeadline(now), now };
  } catch {
    return null;
  }
}
