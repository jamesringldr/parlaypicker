import { PLAYERS, hitRate, sameOwner, tally, type Tally } from "./players";

export interface WeekResults {
  weekNumber: number;
  legs: { owner: string; result: string }[];
}

export interface Standing {
  name: string;
  slug: string;
  record: Tally;
  // Null until one of their legs has hit or missed.
  rate: number | null;
}

// Everyone, best hit rate first. Ties go to more wins, then name. No decided legs sorts last.
export function standings(weeks: WeekResults[]): Standing[] {
  const all = weeks.flatMap((w) => w.legs);
  return PLAYERS.map((p) => {
    const record = tally(all.filter((l) => sameOwner(l.owner, p.name)).map((l) => l.result));
    return { name: p.name, slug: p.slug, record, rate: hitRate(record) };
  }).sort(
    (a, b) =>
      (b.rate ?? -1) - (a.rate ?? -1) || b.record.wins - a.record.wins || a.name.localeCompare(b.name),
  );
}

// Everyone tied for the top and for the bottom hit rate. Empty until someone has a decided leg.
export function extremes(rows: Standing[]): { best: Standing[]; worst: Standing[] } {
  const rated = rows.filter((r) => r.rate !== null);
  if (rated.length === 0) return { best: [], worst: [] };
  const top = Math.max(...rated.map((r) => r.rate!));
  const bottom = Math.min(...rated.map((r) => r.rate!));
  return { best: rated.filter((r) => r.rate === top), worst: rated.filter((r) => r.rate === bottom) };
}

export type Badge = "fire" | "ice";

export const BADGE_EMOJI: Record<Badge, string> = { fire: "🔥", ice: "🧊" };

// The latest week's fantasy high and low scorer, pinned to the top-left of their avatar.
// The best and worst pick of the previous week, pinned to the top-left of the avatar.
export const AWARD_EMOJI: Record<"best" | "worst", string> = { best: "🎯", worst: "🤮" };

const STREAK = 3;

// Fire for a current run of 3 hits, ice for 3 misses. Pushes neither extend nor break a run.
export function streakBadge(results: string[]): Badge | null {
  const decided = results.filter((r) => r === "hit" || r === "miss");
  const last = decided.slice(-STREAK);
  if (last.length < STREAK) return null;
  if (last.every((r) => r === "hit")) return "fire";
  if (last.every((r) => r === "miss")) return "ice";
  return null;
}

// Each player's badge, from their legs in week order.
export function badges(weeks: WeekResults[]): Map<string, Badge> {
  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber).flatMap((w) => w.legs);
  const out = new Map<string, Badge>();
  for (const p of PLAYERS) {
    const badge = streakBadge(ordered.filter((l) => sameOwner(l.owner, p.name)).map((l) => l.result));
    if (badge) out.set(p.slug, badge);
  }
  return out;
}
