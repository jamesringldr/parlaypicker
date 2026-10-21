import "server-only";
import { espnDate } from "@/lib/live/espn-parse";
import { createAdminClient } from "@/lib/supabase/server";
import type { GameCard } from "./espn-games";
import { recordOpens, type League, type StoredOpens } from "./opens";
import { getCollegeSlateOn, getNflSlateOn } from "./scoreboard";

const key = (league: League) => `line-opens:${league}`;

// Where each upcoming game's line first stood when we looked, by ESPN game id.
export async function getLineOpens(league: League): Promise<StoredOpens> {
  const { data, error } = await createAdminClient().from("odds_snapshots").select("data").eq("key", key(league)).maybeSingle();
  if (error) throw new Error(`Couldn't load the opening lines: ${error.message}`);
  return (data?.data as { opens?: StoredOpens } | null)?.opens ?? {};
}

// Looks at the next eight days of games, which reaches the coming weekend however far ESPN's default week has
// got, and saves the line of every game that doesn't have one yet.
export async function pullLineOpens(league: League, now = Date.now()): Promise<{ added: number; total: number }> {
  const days = [...new Set(Array.from({ length: 8 }, (_, i) => espnDate(new Date(now + i * 24 * 60 * 60 * 1000).toISOString())))];
  const results = await Promise.allSettled(days.map((d) => (league === "nfl" ? getNflSlateOn(d) : getCollegeSlateOn(d))));
  const slates = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (slates.length === 0) throw new Error("ESPN could not be reached.");

  const games = [...new Map(slates.flatMap((s) => s.games).map((g): [string, GameCard] => [g.id, g])).values()];
  const { opens, added } = recordOpens(await getLineOpens(league), games, now);
  const { error } = await createAdminClient().from("odds_snapshots").upsert({ key: key(league), fetched_at: new Date(now).toISOString(), data: { opens } });
  if (error) throw new Error(`Couldn't save the opening lines: ${error.message}`);
  return { added, total: Object.keys(opens).length };
}
