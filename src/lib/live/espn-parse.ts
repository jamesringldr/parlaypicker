// Parsers for ESPN's unofficial site API. Pure functions, no fetching, so they can be tested
// and so a shape change shows up as an empty result rather than a crash.
import { normName, type BoxScore, type GameScore } from "./grade";

export interface EspnGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  score: GameScore;
  started: boolean;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const QUARTER_SECONDS = 15 * 60;

// How much of regulation is gone, 0 to 1, from the quarter and the clock ("7:58" left in the
// 3rd = 0.62). Halftime is 0.5. Overtime counts as the whole game.
export function elapsedShare(period: number | null, displayClock: unknown): number | undefined {
  if (period === null || period < 1 || typeof displayClock !== "string") return undefined;
  if (period > 4) return 1;
  const [min, sec] = displayClock.split(":").map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined;
  const left = Math.min(QUARTER_SECONDS, min * 60 + sec);
  return ((period - 1) * QUARTER_SECONDS + (QUARTER_SECONDS - left)) / (4 * QUARTER_SECONDS);
}

export function parseScoreboard(json: unknown): EspnGame[] {
  if (!isObj(json)) return [];
  const games: EspnGame[] = [];
  for (const event of arr(json.events)) {
    if (!isObj(event)) continue;
    const competition = arr(event.competitions)[0];
    if (!isObj(competition) || typeof event.id !== "string") continue;

    const side = (homeAway: string) =>
      arr(competition.competitors).find((c): c is Json => isObj(c) && c.homeAway === homeAway);
    const home = side("home");
    const away = side("away");
    const homeTeam = isObj(home?.team) ? home.team.displayName : undefined;
    const awayTeam = isObj(away?.team) ? away.team.displayName : undefined;
    if (typeof homeTeam !== "string" || typeof awayTeam !== "string") continue;

    const status = isObj(event.status) ? event.status : {};
    const type = isObj(status.type) ? status.type : {};
    const state = type.state; // "pre" | "in" | "post"
    const started = state === "in" || state === "post";
    const completed = type.completed === true;
    const elapsed = completed ? 1 : state === "in" ? elapsedShare(num(status.period), status.displayClock) : undefined;

    games.push({
      id: event.id,
      homeTeam,
      awayTeam,
      started,
      score: {
        completed,
        homeScore: started ? num(home?.score) : null,
        awayScore: started ? num(away?.score) : null,
        clock: state === "in" && typeof type.shortDetail === "string" ? type.shortDetail : undefined,
        elapsed,
      },
    });
  }
  return games;
}

const GROUPS = { rushing: "rush", receiving: "rec", passing: "pass" } as const;

export function parseBox(json: unknown): BoxScore | null {
  if (!isObj(json)) return null;
  const teams = arr(isObj(json.boxscore) ? json.boxscore.players : undefined);
  if (teams.length === 0) return null;

  const box: BoxScore = { rush: new Map(), rec: new Map(), pass: new Map(), tdPlays: [] };

  for (const team of teams) {
    if (!isObj(team)) continue;
    for (const group of arr(team.statistics)) {
      if (!isObj(group) || typeof group.name !== "string" || !(group.name in GROUPS)) continue;
      const target = box[GROUPS[group.name as keyof typeof GROUPS]];
      const yds = arr(group.labels).indexOf("YDS");
      if (yds < 0) continue;
      for (const row of arr(group.athletes)) {
        if (!isObj(row) || !isObj(row.athlete) || typeof row.athlete.displayName !== "string") continue;
        const value = num(arr(row.stats)[yds]);
        if (value !== null) target.set(normName(row.athlete.displayName), value);
      }
    }
  }

  for (const play of arr(json.scoringPlays)) {
    if (!isObj(play) || typeof play.text !== "string") continue;
    const kind = isObj(play.type) && typeof play.type.text === "string" ? play.type.text : "";
    if (kind.includes("Touchdown")) box.tdPlays.push(normName(play.text));
  }

  return box;
}
