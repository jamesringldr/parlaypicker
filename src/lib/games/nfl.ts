import "server-only";
import { cached } from "@/lib/odds/the-odds-api";
import { parseGames, parseWeekNumber, type GameCard } from "./espn-games";

// ESPN's free scoreboard carries DraftKings lines, so this tab costs no Odds API credits.
const API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const TTL_MS = 60 * 1000;
export const REGULAR_SEASON_WEEKS = 18;

export interface NflWeek {
  week: number;
  games: GameCard[];
}

// `week` null means the current week.
export function getNflWeek(week: number | null): Promise<NflWeek> {
  return cached(`nfl-week:${week ?? "current"}`, TTL_MS, async () => {
    const url = week === null ? API : `${API}?week=${week}&seasontype=2`;
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    } catch {
      throw new Error("ESPN could not be reached.");
    }
    if (!response.ok) throw new Error(`ESPN request failed (${response.status}).`);
    const json: unknown = await response.json();
    return {
      week: parseWeekNumber(json) ?? week ?? 1,
      games: parseGames(json).sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    };
  });
}
