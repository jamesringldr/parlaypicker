import "server-only";
import { OddsApiError, orderPool, withFallback, type PooledKey } from "./key-pool";
import { FANDUEL, isOddsApiEvent, toEventOdds, type OddsApiEventOdds } from "./map";
import { PROP_MARKETS, toGameProps, type GameProps, type PropsSnapshot } from "./props";
import { matchesFor, savePropsSnapshot } from "./props-store";
import { oddsRequest } from "./the-odds-api";
import { SPORTS } from "./types";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface PullResult {
  saved: boolean;
  games: number;
  creditsUsed: number;
  // Credits left on each key, in the order the keys were given. Never the keys themselves.
  creditsRemaining: (number | null)[];
  errors: string[];
}

const total = (values: (number | null)[]) => (values.some((v) => v !== null) ? values.reduce<number>((a, v) => a + (v ?? 0), 0) : null);

// Pulls FanDuel's player props for the NFL games in the next week and stores them. One call per
// game, one credit per prop market that has data. Listing the games is free. Every call goes to
// the key with the most credits, and moves to the next key if one runs out or is rejected.
export async function pullNflProps(apiKeys: string[], now = Date.now()): Promise<PullResult> {
  const sport = SPORTS.nfl.key;
  const pool: PooledKey[] = apiKeys.map((key) => ({ key, remaining: null }));
  const errors: string[] = [];

  // The games list is free, and every answer says how many credits that key has left.
  let list: unknown = null;
  for (const entry of pool) {
    try {
      const response = await oddsRequest(`/sports/${sport}/events`, {}, entry.key);
      entry.remaining = response.remaining;
      list ??= response.data;
    } catch (error) {
      if (!(error instanceof OddsApiError)) throw error;
      entry.remaining = 0;
    }
  }
  const ordered = orderPool(pool);
  const remainingNow = () => pool.map((p) => p.remaining);

  const upcoming = (Array.isArray(list) ? list.filter(isOddsApiEvent) : [])
    .filter((e) => {
      const kickoff = new Date(e.commence_time).getTime();
      return kickoff > now && kickoff < now + WINDOW_MS;
    })
    .sort((a, b) => a.commence_time.localeCompare(b.commence_time));

  const games: GameProps[] = [];
  let creditsUsed = 0;

  for (const event of upcoming) {
    try {
      const response = await withFallback(ordered, PROP_MARKETS.length, (key) =>
        oddsRequest(
          `/sports/${sport}/events/${encodeURIComponent(event.id)}/odds`,
          { bookmakers: FANDUEL, markets: PROP_MARKETS.join(","), oddsFormat: "american" },
          key,
        ).then((r) => ({ value: r, remaining: r.remaining })),
      );
      if (response === null) {
        errors.push("Stopped early: no key has enough credits left.");
        break;
      }
      creditsUsed += response.cost ?? 0;
      if (isOddsApiEvent(response.data)) games.push(toGameProps(toEventOdds("nfl", response.data as OddsApiEventOdds)));
    } catch (error) {
      errors.push(`${event.away_team} @ ${event.home_team}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  // Never replace a good snapshot with an empty one.
  if (games.length === 0) return { saved: false, games: 0, creditsUsed, creditsRemaining: remainingNow(), errors };

  const snapshot: PropsSnapshot = {
    fetchedAt: new Date(now).toISOString(),
    games,
    creditsRemaining: total(remainingNow()),
    ...(await matchesFor(games)),
  };
  await savePropsSnapshot(snapshot);
  return { saved: true, games: games.length, creditsUsed, creditsRemaining: remainingNow(), errors };
}
