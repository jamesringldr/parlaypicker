import "server-only";
import { cached } from "@/lib/odds/the-odds-api";
import { parseGames, parseWeekNumber, type GameCard } from "./espn-games";

// ESPN's free scoreboards carry DraftKings lines, so the Games tab costs no Odds API credits.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football";
const TTL_MS = 60 * 1000;

export interface Slate {
  week: number;
  games: GameCard[];
}

// The ten FBS conferences, by ESPN's group id.
export const CONFERENCES = [
  { key: "acc", label: "ACC", id: 1 },
  { key: "american", label: "American", id: 151 },
  { key: "big12", label: "Big 12", id: 4 },
  { key: "bigten", label: "Big Ten", id: 5 },
  { key: "cusa", label: "CUSA", id: 12 },
  { key: "mac", label: "MAC", id: 15 },
  { key: "mwc", label: "Mountain West", id: 17 },
  { key: "pac12", label: "Pac-12", id: 9 },
  { key: "sec", label: "SEC", id: 8 },
  { key: "sunbelt", label: "Sun Belt", id: 37 },
] as const;

export type CollegeFilter = "top25" | (typeof CONFERENCES)[number]["key"];

export const isCollegeFilter = (value: unknown): value is CollegeFilter =>
  value === "top25" || CONFERENCES.some((c) => c.key === value);

function fetchSlate(path: string): Promise<Slate> {
  return cached(`slate:${path}`, TTL_MS, async () => {
    let response: Response;
    try {
      response = await fetch(`${ESPN}${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    } catch {
      throw new Error("ESPN could not be reached.");
    }
    if (!response.ok) throw new Error(`ESPN request failed (${response.status}).`);
    const json: unknown = await response.json();
    return {
      week: parseWeekNumber(json) ?? 1,
      games: parseGames(json).sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    };
  });
}

// This week's NFL games.
export const getNflSlate = () => fetchSlate("/nfl/scoreboard");

// This week's FBS games: every game with a ranked team, or one conference's games.
export async function getCollegeSlate(filter: CollegeFilter): Promise<Slate> {
  const conference = CONFERENCES.find((c) => c.key === filter);
  if (conference) return fetchSlate(`/college-football/scoreboard?groups=${conference.id}&limit=300`);
  const all = await fetchSlate("/college-football/scoreboard?groups=80&limit=300");
  return { ...all, games: all.games.filter((g) => g.away.rank !== null || g.home.rank !== null) };
}
