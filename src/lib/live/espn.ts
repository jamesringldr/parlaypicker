import "server-only";
import { cached } from "@/lib/odds/the-odds-api";
import { parseBox, parseLastScoringPlay, parseScoreboard, type EspnGame } from "./espn-parse";
import type { Sport } from "@/lib/odds/types";
import type { BoxScore } from "./grade";

// ESPN's unofficial site API: free, no key, and it can change without notice. Everything here
// is cached and parsed defensively, and callers fall back to The Odds API if it fails.
const API = "https://site.api.espn.com/apis/site/v2/sports/football";
// groups=80 is all of FBS; without it the college board only lists top-25 and featured games.
const SCOREBOARD_PATH: Record<Sport, string> = {
  nfl: "/nfl/scoreboard",
  ncaaf: "/college-football/scoreboard?groups=80&limit=300",
};
const SUMMARY_PATH: Record<Sport, string> = { nfl: "/nfl/summary", ncaaf: "/college-football/summary" };
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

export function getEspnScoreboard(sport: Sport): Promise<EspnGame[]> {
  return cached(`espn:scoreboard:${sport}`, TTL_MS, async () => parseScoreboard(await espnGet(SCOREBOARD_PATH[sport])));
}

export interface EspnSummary {
  box: BoxScore | null;
  lastScoringPlay: string | null;
}

// One call per game gives both the player stats (props) and the scoring plays (last score).
export function getEspnSummary(sport: Sport, espnEventId: string): Promise<EspnSummary> {
  return cached(`espn:summary:${sport}:${espnEventId}`, TTL_MS, async () => {
    const json = await espnGet(`${SUMMARY_PATH[sport]}?event=${encodeURIComponent(espnEventId)}`);
    return { box: parseBox(json), lastScoringPlay: parseLastScoringPlay(json) };
  });
}
