import { PLAYERS, sameOwner } from "./players";

export type SlipStatus = "missing" | "miss" | "open" | "hit" | "push";

// Who needs attention first: no pick, then misses, then what's still going, then hits and pushes.
export const STATUS_ORDER: SlipStatus[] = ["missing", "miss", "open", "hit", "push"];

export interface SlipLeg {
  id: string;
  owner: string;
  label: string;
  matchup?: string;
  price?: number;
  status: Exclude<SlipStatus, "missing">;
}

export interface SlipRow {
  key: string;
  slug: string;
  name: string;
  status: SlipStatus;
  leg?: SlipLeg;
}

// One row per pick, and one "missing" row for a player with none. Owners outside the roster are skipped.
export function slipRows(legs: SlipLeg[]): SlipRow[] {
  const rows = PLAYERS.flatMap((p): SlipRow[] => {
    const mine = legs.filter((l) => sameOwner(l.owner, p.name));
    if (mine.length === 0) return [{ key: `${p.slug}-missing`, slug: p.slug, name: p.name, status: "missing" }];
    return mine.map((leg) => ({ key: leg.id, slug: p.slug, name: p.name, status: leg.status, leg }));
  });
  return rows.sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name),
  );
}
