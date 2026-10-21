import "server-only";
import { cached, oddsGet } from "@/lib/odds/the-odds-api";
import { SPORTS, type Sport } from "@/lib/odds/types";
import { getEspnScoreboard, getEspnSummary } from "./espn";
import { espnDate, type EspnGame } from "./espn-parse";
import { legKey, normName, type BoxScore, type GameScore, type Leg } from "./grade";

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
  // Both keyed by legKey: the leg's eventId (The Odds API's game id), or its own id if it has none.
  scores: Map<string, GameScore>;
  boxes: Map<string, BoxScore>;
  // True when some scores came from the backup source (no game clock, no prop stats).
  backup: boolean;
  error?: string;
  // When this was loaded (ms). The page uses it as "now" so it doesn't read the clock itself.
  at: number;
}

// Scores and prop stats for the legs' games. ESPN first, The Odds API for anything ESPN can't
// answer. Nothing is fetched until a leg's game has kicked off.
export async function getScores(legs: Leg[]): Promise<LiveData> {
  const now = Date.now();
  const started = legs.filter(
    (l) => l.commenceTime && new Date(l.commenceTime).getTime() <= now,
  );
  const data: LiveData = { scores: new Map(), boxes: new Map(), backup: false, at: now };
  if (started.length === 0) return data;

  // ESPN knows these games by team names, not by The Odds API's ids.
  const sportsStarted = [...new Set(started.map((l) => l.sport))];
  const games = new Map<Sport, EspnGame[]>();
  await Promise.all(
    sportsStarted.map(async (sport) => {
      try {
        const days = [...new Set(started.filter((l) => l.sport === sport).map((l) => espnDate(l.commenceTime!)))];
        games.set(sport, await getEspnScoreboard(sport, days));
      } catch {
        // Fall through to the backup source below.
      }
    }),
  );
  const sameTeam = (name: string, full: string, short: string) => {
    const n = normName(name);
    return n === normName(full) || n === normName(short);
  };
  const espnGame = (leg: Leg) =>
    leg.homeTeam && leg.awayTeam
      ? games
          .get(leg.sport)
          ?.find(
            (g) => sameTeam(leg.homeTeam!, g.homeTeam, g.homeShort) && sameTeam(leg.awayTeam!, g.awayTeam, g.awayShort),
          )
      : undefined;

  // Group legs by game so each ESPN game is read once, however many legs are on it.
  const byGame = new Map<string, { sport: Sport; game: EspnGame; legs: Leg[] }>();
  for (const leg of started) {
    const game = espnGame(leg);
    if (!game) continue;
    data.scores.set(legKey(leg), game.score);
    const key = `${leg.sport}:${game.id}`;
    const entry = byGame.get(key) ?? { sport: leg.sport, game, legs: [] };
    entry.legs.push(leg);
    byGame.set(key, entry);
  }

  await Promise.all(
    [...byGame.values()].map(async ({ sport, game, legs: gameLegs }) => {
      // Player stats grade props (hand-marked ones don't need them). The last scoring play
      // fills the detail line of a game leg, only while the game is on.
      const needsBox = gameLegs.some((l) => l.kind === "prop" && l.prop && !l.manual);
      const needsPlay = !game.score.completed && gameLegs.some((l) => l.kind !== "prop");
      if (!game.started || (!needsBox && !needsPlay)) return;

      const summary = await getEspnSummary(sport, game.id).catch(() => null);
      if (!summary) return;
      for (const leg of gameLegs) {
        if (summary.box) data.boxes.set(legKey(leg), summary.box);
        if (needsPlay) {
          data.scores.set(legKey(leg), { ...game.score, lastPlay: summary.lastScoringPlay ?? "No scoring yet" });
        }
      }
    }),
  );

  const missing = started.filter((l) => l.kind !== "prop" && !data.scores.has(legKey(l)));
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
