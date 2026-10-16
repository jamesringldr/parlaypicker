import { PLAYERS, hitRate, sameOwner, tally, type Tally } from "./players";

export interface WeekResults {
  weekNumber: number;
  totalPrice: number | null;
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

export interface WeekSummary {
  weekNumber: number;
  hits: number;
  total: number;
  won: boolean;
}

export function summarizeWeeks(weeks: WeekResults[]): WeekSummary[] {
  return weeks.map((w) => {
    const record = tally(w.legs.map((l) => l.result));
    return { weekNumber: w.weekNumber, hits: record.wins, total: w.legs.length, won: record.losses === 0 };
  });
}

// Weeks with the highest and lowest share of legs hit. A tie goes to the later week.
export function bestAndWorstWeek(summaries: WeekSummary[]): { best: WeekSummary | null; worst: WeekSummary | null } {
  if (summaries.length === 0) return { best: null, worst: null };
  const share = (w: WeekSummary) => (w.total === 0 ? 0 : w.hits / w.total);
  const sorted = [...summaries].sort((a, b) => share(b) - share(a) || b.weekNumber - a.weekNumber);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}
