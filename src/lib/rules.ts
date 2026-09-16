import type { Outcome } from "./odds/types";

// Two picks with the same conflict key cannot both be on a parlay. The
// database enforces this with a unique (parlay_id, conflict_key) constraint.
//
// - Moneyline, spread, total: one leg per game per market type. Blocks the same
//   selection at any line (Chiefs -3.5 vs alt Chiefs -7) and the opposite side
//   (Bills +3.5, Under after Over).
// - Props: one leg per player per stat, so Mahomes pass yds O 275.5 blocks
//   U 275.5 and O 300.5, but another player or stat on that game is open.
export function conflictKey(
  eventId: string,
  market: string,
  outcome: Pick<Outcome, "description">,
): string {
  if (market === "h2h") return `${eventId}|moneyline`;
  if (market === "spreads" || market === "alternate_spreads") return `${eventId}|spread`;
  if (market === "totals" || market === "alternate_totals") return `${eventId}|total`;

  const stat = market.replace(/_alternate$/, "");
  const player = (outcome.description ?? "").trim().toLowerCase();
  return `${eventId}|${stat}|${player}`;
}

export function toDecimal(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

export function toAmerican(decimal: number): number {
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

export function parlayPrice(prices: number[]): number | null {
  if (prices.length === 0) return null;
  return toAmerican(prices.reduce((acc, p) => acc * toDecimal(p), 1));
}

export function formatPrice(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}
