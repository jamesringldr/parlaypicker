import "server-only";
import { cached, oddsGet } from "@/lib/odds/the-odds-api";
import { SPORTS, type Sport } from "@/lib/odds/types";
import type { GameScore, Leg } from "./grade";

// The scores endpoint costs 2 credits per call (it's the daysFrom form). Every
// viewer on the page shares one call per minute per sport.
const SCORES_TTL_MS = 60 * 1000;

interface ApiScore {
  id: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
}

function isApiScore(value: unknown): value is ApiScore {
  return typeof value === "object" && value !== null && typeof (value as ApiScore).id === "string";
}

function toScore(game: ApiScore): GameScore {
  const pointsFor = (team: string) => {
    const entry = game.scores?.find((s) => s.name === team);
    const n = entry ? Number(entry.score) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return { completed: game.completed, homeScore: pointsFor(game.home_team), awayScore: pointsFor(game.away_team) };
}

function fetchScores(sport: Sport): Promise<Map<string, GameScore>> {
  return cached(`scores:${sport}`, SCORES_TTL_MS, async () => {
    const data = await oddsGet(`/sports/${SPORTS[sport].key}/scores`, { daysFrom: "3" });
    const map = new Map<string, GameScore>();
    if (Array.isArray(data)) for (const game of data.filter(isApiScore)) map.set(game.id, toScore(game));
    return map;
  });
}

// Scores by event id for the legs' games. Skips the paid call until a game has kicked off.
export async function getScores(legs: Leg[]): Promise<{ scores: Map<string, GameScore>; error?: string }> {
  const now = Date.now();
  const started = legs.filter(
    (l) => l.eventId && l.kind !== "prop" && l.commenceTime && new Date(l.commenceTime).getTime() <= now,
  );
  const scores = new Map<string, GameScore>();
  const sports = [...new Set(started.map((l) => l.sport))];

  try {
    for (const sport of sports) {
      for (const [id, score] of await fetchScores(sport)) scores.set(id, score);
    }
  } catch (error) {
    return { scores, error: error instanceof Error ? error.message : "Couldn't load scores." };
  }
  return { scores };
}
