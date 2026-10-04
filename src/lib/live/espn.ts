import "server-only";
import { cached } from "@/lib/odds/the-odds-api";
import { parseBox, parseScoreboard, type EspnGame } from "./espn-parse";
import type { BoxScore } from "./grade";

// ESPN's unofficial site API: free, no key, and it can change without notice. Everything here
// is cached and parsed defensively, and callers fall back to The Odds API if it fails.
const API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const TTL_MS = 30 * 1000;

async function espnGet(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  } catch {
    throw new Error("ESPN could not be reached.");
  }
  if (!response.ok) throw new Error(`ESPN request failed (${response.status}).`);
  return response.json();
}

export function getEspnScoreboard(): Promise<EspnGame[]> {
  return cached("espn:scoreboard", TTL_MS, async () => parseScoreboard(await espnGet("/scoreboard")));
}

export function getEspnBox(espnEventId: string): Promise<BoxScore | null> {
  return cached(`espn:box:${espnEventId}`, TTL_MS, async () =>
    parseBox(await espnGet(`/summary?event=${encodeURIComponent(espnEventId)}`)),
  );
}
