import "server-only";
import { cached, oddsGet } from "@/lib/odds/the-odds-api";
import { SPORTS, type Sport } from "@/lib/odds/types";
import { getEspnBox, getEspnScoreboard } from "./espn";
import type { BoxScore, GameScore, Leg } from "./grade";

// Backup source. The scores endpoint costs 2 credits per call (the daysFrom form), so every
// viewer shares one call per minute per sport, and it's only used when ESPN has no answer.
const ODDS_SCORES_TTL_MS = 60 * 1000;

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

function fetchOddsApiScores(sport: Sport): Promise<Map<string, GameScore>> {
  return cached(`scores:${sport}`, ODDS_SCORES_TTL_MS, async () => {
    const data = await oddsGet(`/sports/${SPORTS[sport].key}/scores`, { daysFrom: "3" });
    const map = new Map<string, GameScore>();
    if (Array.isArray(data)) for (const game of data.filter(isApiScore)) map.set(game.id, toScore(game));
    return map;
  });
}

export interface LiveData {
  // Both keyed by the leg's eventId (The Odds API's game id).
  scores: Map<string, GameScore>;
  boxes: Map<string, BoxScore>;
  // True when some scores came from the backup source (no game clock, no prop stats).
  backup: boolean;
  error?: string;
}

// Scores and prop stats for the legs' games. ESPN first, The Odds API for anything ESPN can't
// answer. Nothing is fetched until a leg's game has kicked off.
export async function getScores(legs: Leg[]): Promise<LiveData> {
  const now = Date.now();
  const started = legs.filter(
    (l) => l.eventId && l.commenceTime && new Date(l.commenceTime).getTime() <= now,
  );
  const data: LiveData = { scores: new Map(), boxes: new Map(), backup: false };
  if (started.length === 0) return data;

  // ESPN knows these games by team names, not by The Odds API's ids.
  let espn: Awaited<ReturnType<typeof getEspnScoreboard>> = [];
  try {
    espn = await getEspnScoreboard();
  } catch {
    // Fall through to the backup source below.
  }
  const bySides = new Map(espn.map((g) => [`${g.homeTeam}|${g.awayTeam}`, g]));
  const espnGame = (leg: Leg) =>
    leg.sport === "nfl" && leg.homeTeam && leg.awayTeam ? bySides.get(`${leg.homeTeam}|${leg.awayTeam}`) : undefined;

  for (const leg of started) {
    const game = espnGame(leg);
    if (game) data.scores.set(leg.eventId!, game.score);
  }

  // Hand-marked props never need stats, and props with no stat spec can't use them.
  for (const leg of started) {
    const game = espnGame(leg);
    if (leg.kind !== "prop" || !leg.prop || leg.manual || !game?.started) continue;
    const box = await getEspnBox(game.id).catch(() => null);
    if (box) data.boxes.set(leg.eventId!, box);
  }

  const missing = started.filter((l) => l.kind !== "prop" && !data.scores.has(l.eventId!));
  const sports = [...new Set(missing.map((l) => l.sport))];
  try {
    for (const sport of sports) {
      for (const [id, score] of await fetchOddsApiScores(sport)) {
        if (!data.scores.has(id)) data.scores.set(id, score);
      }
      data.backup = true;
    }
  } catch (error) {
    data.error = error instanceof Error ? error.message : "Couldn't load scores.";
  }
  return data;
}
