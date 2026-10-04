import type { Sport } from "@/lib/odds/types";

export type LegKind = "moneyline" | "spread" | "total" | "prop";
export type Manual = "hit" | "miss" | "push";

export type PropStat = "rush_yds" | "rec_yds" | "pass_yds" | "anytime_td";

// What an auto-graded player prop needs. Props without one are hand-marked.
export interface PropSpec {
  player: string;
  stat: PropStat;
  // Yardage props only.
  side?: "over" | "under";
  point?: number;
}

export const PROP_STATS: Record<PropStat, { label: string; unit: string; yards: boolean }> = {
  rush_yds: { label: "Rushing yds", unit: "rush yds", yards: true },
  rec_yds: { label: "Receiving yds", unit: "rec yds", yards: true },
  pass_yds: { label: "Passing yds", unit: "pass yds", yards: true },
  anytime_td: { label: "Any time touchdown scorer", unit: "TD", yards: false },
};

export interface Leg {
  id: string;
  owner: string;
  kind: LegKind;
  label: string;
  // Line under the label, e.g. "Rushing yds". Defaults to the leg type.
  market?: string;
  // Which team a prop player is on (picks the logo). Game legs use `side`.
  team?: string;
  price?: number; // American odds
  sport: Sport;
  // Game info. Required for ml/spread/total so they can be auto-graded; optional for props.
  eventId?: string;
  matchup?: string;
  commenceTime?: string;
  homeTeam?: string;
  awayTeam?: string;
  // "home" | "away" for ml/spread, "over" | "under" for total.
  side?: "home" | "away" | "over" | "under";
  point?: number;
  prop?: PropSpec;
  // Hand-set result. Always wins over the auto grade.
  manual?: Manual;
}

export interface GameScore {
  completed: boolean;
  homeScore: number | null;
  awayScore: number | null;
  // "Q3 · 7:58" or "Halftime". Only from sources that have a game clock.
  clock?: string;
  // Share of regulation played, 0 to 1. Only from sources that have a game clock.
  elapsed?: number;
  // The latest scoring play, or "No scoring yet". Only while the game is live.
  lastPlay?: string;
}

// Player stats for one game, keyed by normName().
export interface BoxScore {
  rush: Map<string, number>;
  rec: Map<string, number>;
  pass: Map<string, number>;
  // Normalized text of each touchdown play, scorer first: "jonathan taylor 5 yd rush ...".
  tdPlays: string[];
}

// "Kenneth Walker III" and "Kenneth Walker" should match; so should punctuation variants.
export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'’,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/ (jr|sr|ii|iii|iv|v)$/, "")
    .trim();
}

// Kicked off and not final. A 0-0 game that just started counts; one that hasn't kicked off doesn't.
export function gameIsLive(score: GameScore | undefined): boolean {
  return !!score && !score.completed && score.homeScore !== null && score.awayScore !== null;
}

export type LegState = "pending" | "winning" | "losing" | "hit" | "miss" | "push";

export interface Grade {
  state: LegState;
  detail: string;
  // Overrides the badge wording, e.g. "On pace" for a prop graded by pace.
  label?: string;
}

// Positive = leg is currently covering, 0 = push, negative = not covering.
function cushion(leg: Leg, score: GameScore): number | null {
  if (score.homeScore === null || score.awayScore === null) return null;
  const { homeScore, awayScore } = score;
  const mine = leg.side === "home" ? homeScore : awayScore;
  const theirs = leg.side === "home" ? awayScore : homeScore;

  if (leg.kind === "moneyline") return mine - theirs;
  if (leg.kind === "spread") return mine - theirs + (leg.point ?? 0);
  if (leg.kind === "total") {
    const total = homeScore + awayScore;
    return leg.side === "over" ? total - (leg.point ?? 0) : (leg.point ?? 0) - total;
  }
  return null;
}

// Pace is meaningless in the first minutes (0 yards at 5% of the game is not "behind").
const PACE_AFTER = 0.25;

const percent = (n: number) => `${Math.round(n * 100)}%`;

const sign = (n: number): "hit" | "miss" | "push" => (n > 0 ? "hit" : n < 0 ? "miss" : "push");

function gradeProp(spec: PropSpec, score: GameScore | undefined, box: BoxScore | undefined): Grade {
  const started = !!score && (score.completed || score.homeScore !== null);
  if (!started || !box) {
    return { state: "pending", detail: started ? "Stats unavailable, marked by hand" : "Not started" };
  }
  const player = normName(spec.player);

  if (spec.stat === "anytime_td") {
    // A passing TD is credited to the receiver, so the scorer's name is what leads the play.
    if (box.tdPlays.some((play) => play.startsWith(`${player} `))) return { state: "hit", detail: "Scored a touchdown" };
    return score.completed
      ? { state: "miss", detail: "Final: no touchdown" }
      : { state: "pending", detail: "No touchdown yet" };
  }

  const { unit } = PROP_STATS[spec.stat];
  const stats = spec.stat === "rush_yds" ? box.rush : spec.stat === "rec_yds" ? box.rec : box.pass;
  const value = stats.get(player) ?? 0;
  const line = spec.point ?? 0;
  const progress = `${value} of ${line} ${unit}`;
  const over = spec.side !== "under";

  // Yardage can still change until the final, so it only settles then.
  if (score.completed) {
    return { state: sign(over ? value - line : line - value), detail: `Final: ${progress}` };
  }
  // Past the line: an over is cashing for now, an under has busted.
  if (value > line) {
    return { state: over ? "winning" : "losing", label: "Over the line", detail: `Live: ${progress}` };
  }

  // Otherwise compare the share of the line reached to the share of the game played. It's a
  // rough guide (game script and garbage time bend it), so it waits until there's enough game
  // to mean something, and it needs a source with a game clock.
  const played = score.elapsed;
  if (played === undefined || played < PACE_AFTER || line <= 0) return { state: "pending", detail: `Live: ${progress}` };

  const share = value / line;
  const onPace = over ? share >= played : share <= played;
  return {
    state: onPace ? "winning" : "losing",
    label: onPace ? "On pace" : "Off pace",
    detail: `Live: ${progress} (${percent(share)} of line, ${percent(played)} of game)`,
  };
}

export function gradeLeg(leg: Leg, score: GameScore | undefined, box?: BoxScore): Grade {
  if (leg.manual) return { state: leg.manual, detail: "Marked by hand" };
  if (leg.kind === "prop") {
    return leg.prop ? gradeProp(leg.prop, score, box) : { state: "pending", detail: "Tracked by hand" };
  }
  if (!score) return { state: "pending", detail: "Not started" };

  const margin = cushion(leg, score);
  if (margin === null) return { state: "pending", detail: "Not started" };

  // The score is already in the line above the leg, so the detail says something new.
  if (score.completed) return { state: sign(margin), detail: "Final" };
  return {
    state: margin > 0 ? "winning" : margin < 0 ? "losing" : "pending",
    detail: score.lastPlay ?? "Live",
  };
}

export type ParlayState = "alive" | "dead" | "won";

// A miss kills the parlay. It only wins once every leg has hit or pushed.
export function parlayState(grades: Grade[]): ParlayState {
  if (grades.some((g) => g.state === "miss")) return "dead";
  if (grades.length > 0 && grades.every((g) => g.state === "hit" || g.state === "push")) return "won";
  return "alive";
}
