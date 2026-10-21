import { describe, expect, it } from "vitest";
import type { Lines } from "./espn-games";
import { formatMove, moveSize, sortByMovement, spreadMove, totalMove } from "./movement";

const lines = (over: Partial<Lines> & { open: Lines["open"] }): Lines => ({
  spread: { away: { line: 4.5, odds: -110 }, home: { line: -4.5, odds: -110 } },
  total: { over: { line: 43, odds: -110 }, under: { line: 43, odds: -110 } },
  moneyline: { away: 180, home: -220 },
  ...over,
});

describe("spreadMove", () => {
  // Home opened -3 and is now -4.5.
  const l = lines({ open: { total: 41.5, favorite: "home", spread: -3 } });
  it("is the current line minus the opening line, for each team", () => {
    expect(spreadMove(l, "home")).toBe(-1.5);
    expect(spreadMove(l, "away")).toBe(1.5);
  });
  it("handles a favorite that flipped", () => {
    const flipped = lines({ open: { total: null, favorite: "away", spread: -1 } }); // away opened -1, now +4.5
    expect(spreadMove(flipped, "away")).toBe(5.5);
    expect(spreadMove(flipped, "home")).toBe(-5.5);
  });
  it("treats a pick'em open as 0 for both", () => {
    const pk = lines({ open: { total: null, favorite: null, spread: -0 } });
    expect(spreadMove(pk, "home")).toBe(-4.5);
    expect(spreadMove(pk, "away")).toBe(4.5);
  });
  it("is null without an opening or current line", () => {
    expect(spreadMove(lines({ open: { total: null, favorite: null, spread: null } }), "home")).toBeNull();
    expect(spreadMove(lines({ open: { total: null, favorite: "home", spread: -3 }, spread: { away: null, home: null } }), "home")).toBeNull();
  });
  it("is 0, not -0, when it has not moved", () => {
    const same = lines({ open: { total: null, favorite: "home", spread: -4.5 } });
    expect(Object.is(spreadMove(same, "home"), 0)).toBe(true);
    expect(Object.is(spreadMove(same, "away"), 0)).toBe(true);
  });
});

describe("totalMove", () => {
  it("is the current total minus the opening total", () => {
    expect(totalMove(lines({ open: { total: 41.5, favorite: "home", spread: -3 } }))).toBe(1.5);
    expect(totalMove(lines({ open: { total: 44, favorite: "home", spread: -3 } }))).toBe(-1);
  });
  it("is null without either number", () => {
    expect(totalMove(lines({ open: { total: null, favorite: null, spread: null } }))).toBeNull();
    expect(totalMove(lines({ open: { total: 41.5, favorite: null, spread: null }, total: { over: null, under: null } }))).toBeNull();
  });
});

describe("formatMove", () => {
  it("points the way the number went", () => {
    expect(formatMove(1.5)).toBe("▲1.5");
    expect(formatMove(-2)).toBe("▼2");
    expect(formatMove(0)).toBe("0");
  });
});

describe("sortByMovement", () => {
  const game = (id: string, open: Lines["open"], now: { home: number; total: number }) => ({
    id,
    lines: lines({
      open,
      spread: { away: { line: -now.home, odds: -110 }, home: { line: now.home, odds: -110 } },
      total: { over: { line: now.total, odds: -110 }, under: { line: now.total, odds: -110 } },
    }),
  });
  // a: spread moved 1, total 4. b: spread moved 3, total 0. c: spread moved 2, total 2. d: no open line.
  const games = [
    game("a", { total: 40, favorite: "home", spread: -3 }, { home: -4, total: 44 }),
    game("b", { total: 45, favorite: "home", spread: -3 }, { home: -6, total: 45 }),
    game("c", { total: 50, favorite: "home", spread: -3 }, { home: -1, total: 48 }),
    { id: "d", lines: null },
  ];

  it("puts the biggest spread move first, whichever way it went, and games without lines last", () => {
    expect(sortByMovement(games, "spread").map((g) => g.id)).toEqual(["b", "c", "a", "d"]);
  });
  it("sorts by total movement separately", () => {
    expect(sortByMovement(games, "total").map((g) => g.id)).toEqual(["a", "c", "b", "d"]);
  });
  it("keeps kickoff order for ties and doesn't change the original", () => {
    const tied = [game("x", { total: 40, favorite: "home", spread: -3 }, { home: -4, total: 41 }), game("y", { total: 40, favorite: "home", spread: -3 }, { home: -4, total: 41 })];
    expect(sortByMovement(tied, "spread").map((g) => g.id)).toEqual(["x", "y"]);
    expect(games.map((g) => g.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("moveSize is null without lines", () => {
    expect(moveSize(null, "spread")).toBeNull();
  });
});
