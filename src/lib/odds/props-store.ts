import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { buildRosterIndex, matchPlayers, type PlayerMatches } from "@/lib/games/headshots";
import { fetchRosters } from "@/lib/games/headshots-fetch";
import type { GameProps, PropsSnapshot } from "./props";

// Best effort: if ESPN is down the props still save, just without photos or sides.
export async function matchesFor(games: GameProps[]): Promise<PlayerMatches> {
  try {
    return matchPlayers(buildRosterIndex(await fetchRosters()), games);
  } catch {
    return { photos: {}, sides: {} };
  }
}

const KEY = "nfl-props";

export async function getPropsSnapshot(): Promise<PropsSnapshot | null> {
  const { data, error } = await createAdminClient().from("odds_snapshots").select("fetched_at, data").eq("key", KEY).maybeSingle();
  if (error) throw new Error(`Couldn't load the props: ${error.message}`);
  if (!data) return null;
  const stored = data.data as Pick<PropsSnapshot, "games" | "creditsRemaining"> & Partial<Pick<PropsSnapshot, "photos" | "sides">>;
  return { fetchedAt: data.fetched_at, games: stored.games, creditsRemaining: stored.creditsRemaining, photos: stored.photos ?? {}, sides: stored.sides ?? {} };
}

export async function savePropsSnapshot(snapshot: PropsSnapshot) {
  const { error } = await createAdminClient()
    .from("odds_snapshots")
    .upsert({
      key: KEY,
      fetched_at: snapshot.fetchedAt,
      data: { games: snapshot.games, creditsRemaining: snapshot.creditsRemaining, photos: snapshot.photos, sides: snapshot.sides },
    });
  if (error) throw new Error(`Couldn't save the props: ${error.message}`);
}

export interface UpcomingProps {
  fetchedAt: string;
  photos: Record<string, string>;
  sides: Record<string, "away" | "home">;
  // Games that haven't kicked off, in kickoff order.
  games: GameProps[];
}

export async function getUpcomingProps(now = Date.now()): Promise<UpcomingProps | null> {
  const snapshot = await getPropsSnapshot();
  if (!snapshot) return null;
  const games = snapshot.games
    .filter((g) => new Date(g.commenceTime).getTime() > now)
    .sort((a, b) => a.commenceTime.localeCompare(b.commenceTime));
  return { fetchedAt: snapshot.fetchedAt, photos: snapshot.photos, sides: snapshot.sides, games };
}

// Re-matches photos on the stored games. Free: no Odds API credits, just ESPN rosters.
export async function refreshSnapshotPhotos(): Promise<{ players: number; matched: number } | null> {
  const snapshot = await getPropsSnapshot();
  if (!snapshot) return null;
  const { photos, sides } = await matchesFor(snapshot.games);
  await savePropsSnapshot({ ...snapshot, photos, sides });
  const players = new Set(snapshot.games.flatMap((g) => Object.values(g.markets).flatMap((rows) => rows.map((r) => r.player))));
  return { players: players.size, matched: Object.keys(photos).length };
}
