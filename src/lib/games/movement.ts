import type { Lines } from "./espn-games";

export type MoveKind = "spread" | "total";

export const isMoveKind = (value: unknown): value is MoveKind => value === "spread" || value === "total";

// Rounds to the half-points books use, and turns -0 into 0.
const clean = (n: number) => Math.round(n * 10) / 10 + 0;

// How far a team's spread has moved since it opened: the current line minus the opening line, so -3 to -4.5 is
// -1.5 (the team got more favored). Null when either line is missing.
export function spreadMove(lines: Lines, which: "away" | "home"): number | null {
  const { favorite, spread } = lines.open;
  const now = lines.spread[which]?.line ?? null;
  if (spread === null || now === null) return null;
  // `spread` is the favorite's opening number. A pick'em opened at 0 for both.
  const opened = favorite === null ? 0 : favorite === which ? spread : -spread;
  return clean(now - opened);
}

// How far the total has moved since it opened: 41.5 to 43 is +1.5.
export function totalMove(lines: Lines): number | null {
  const now = lines.total.over?.line ?? lines.total.under?.line ?? null;
  return lines.open.total === null || now === null ? null : clean(now - lines.open.total);
}

// "▲1.5" or "▼1.5" in the direction the number went, and "0" when it hasn't moved.
export function formatMove(delta: number): string {
  return delta === 0 ? "0" : `${delta > 0 ? "▲" : "▼"}${Math.abs(delta)}`;
}

// How big the move is, whichever way it went. The same for both teams on a spread.
export function moveSize(lines: Lines | null, kind: MoveKind): number | null {
  if (!lines) return null;
  const delta = kind === "spread" ? spreadMove(lines, "home") : totalMove(lines);
  return delta === null ? null : Math.abs(delta);
}

// Biggest move first. Games with no opening line go last, and ties keep the order they came in (kickoff).
export function sortByMovement<G extends { lines: Lines | null }>(games: G[], kind: MoveKind): G[] {
  return [...games].sort((a, b) => {
    const x = moveSize(a.lines, kind);
    const y = moveSize(b.lines, kind);
    return x === y ? 0 : x === null ? 1 : y === null ? -1 : y - x;
  });
}
