import type { Sport } from "@/lib/odds/types";

export type LegKind = "moneyline" | "spread" | "total" | "prop";
export type Manual = "hit" | "miss" | "push";

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
  // Hand-set result. Always wins over the auto grade, and is the only grade for props.
  manual?: Manual;
}

export interface GameScore {
  completed: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export type LegState = "pending" | "winning" | "losing" | "hit" | "miss" | "push";

export interface Grade {
  state: LegState;
  detail: string;
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

export function gradeLeg(leg: Leg, score: GameScore | undefined): Grade {
  if (leg.manual) return { state: leg.manual, detail: "Marked by hand" };
  if (leg.kind === "prop") return { state: "pending", detail: "Tracked by hand" };
  if (!score) return { state: "pending", detail: "Not started" };

  const margin = cushion(leg, score);
  if (margin === null) return { state: "pending", detail: "Not started" };

  const scoreLine =
    leg.awayTeam && leg.homeTeam
      ? `${leg.awayTeam} ${score.awayScore}, ${leg.homeTeam} ${score.homeScore}`
      : "";

  if (score.completed) {
    return { state: margin > 0 ? "hit" : margin < 0 ? "miss" : "push", detail: `Final: ${scoreLine}` };
  }
  return {
    state: margin > 0 ? "winning" : margin < 0 ? "losing" : "pending",
    detail: `Live: ${scoreLine}`,
  };
}

export type ParlayState = "alive" | "dead" | "won";

// A miss kills the parlay. It only wins once every leg has hit or pushed.
export function parlayState(grades: Grade[]): ParlayState {
  if (grades.some((g) => g.state === "miss")) return "dead";
  if (grades.length > 0 && grades.every((g) => g.state === "hit" || g.state === "push")) return "won";
  return "alive";
}
