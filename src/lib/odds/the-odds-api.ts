import "server-only";
import { FANDUEL, isOddsApiEvent, toEventOdds, toGameEvent, type OddsApiEventOdds } from "./map";
import { SPORTS, type EventOdds, type GameEvent, type OddsProvider } from "./types";

const API = "https://api.the-odds-api.com/v4";

// One credit per market FanDuel actually returns. Props and alt lines are
// only available on the per-game endpoint.
// Alt spreads and totals are omitted on purpose. FanDuel posts a hundred of
// each, which blows the credit cost and the pick screen. The main line is enough.
const EVENT_MARKETS = [
  "h2h",
  "spreads",
  "totals",
  "player_pass_yds",
  "player_rush_yds",
  "player_reception_yds",
  "player_anytime_td",
].join(",");

const EVENTS_TTL_MS = 10 * 60 * 1000;
const ODDS_TTL_MS = 2 * 60 * 1000;

interface CacheEntry<T> {
  expires: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((value) => {
      cache.set(key, { expires: Date.now() + ttlMs, value });
      inflight.delete(key);
      return value;
    })
    .catch((error: unknown) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, promise);
  return promise;
}

export async function oddsGet(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("ODDS_API_KEY is not set.");

  const url = new URL(`${API}${path}`);
  url.searchParams.set("apiKey", key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

  let response: Response;
  try {
    // Our own cache. no-store keeps the key out of Next's fetch cache.
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error("Odds API could not be reached.");
  }

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Odds API request failed (${response.status}).`);
  return response.json();
}

export const fanduelOddsProvider: OddsProvider = {
  listEvents(sport) {
    return cached(`events:${sport}`, EVENTS_TTL_MS, async () => {
      const data = await oddsGet(`/sports/${SPORTS[sport].key}/events`, {});
      if (!Array.isArray(data)) return [] satisfies GameEvent[];
      return data.filter(isOddsApiEvent).map((event) => toGameEvent(sport, event));
    });
  },

  getEventOdds(sport, eventId) {
    return cached(`odds:${sport}:${eventId}`, ODDS_TTL_MS, async () => {
      const data = await oddsGet(`/sports/${SPORTS[sport].key}/events/${encodeURIComponent(eventId)}/odds`, {
        bookmakers: FANDUEL,
        markets: EVENT_MARKETS,
        oddsFormat: "american",
      });
      if (!isOddsApiEvent(data)) return null;
      return toEventOdds(sport, data as OddsApiEventOdds) satisfies EventOdds | null;
    });
  },
};
