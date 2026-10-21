import { describe, expect, it } from "vitest";
import type { GameCard, Lines } from "./espn-games";
import { applyOpens, isOpenPullTime, recordOpens, type StoredOpens } from "./opens";
import { spreadMove, totalMove } from "./movement";

const NOW = Date.parse("2026-10-25T08:00:00Z");
const side = (name: string) => ({ abbr: "X", name, record: null, rank: null, logo: "", score: null });
const lines = (homeSpread: number, total: number): Lines => ({
  spread: { away: { line: -homeSpread, odds: -110 }, home: { line: homeSpread, odds: -110 } },
  total: { over: { line: total, odds: -110 }, under: { line: total, odds: -110 } },
  moneyline: { away: null, home: null },
  // ESPN's own open, which can be from the preseason.
  open: { total: 54.5, favorite: "home", spread: -2.5 },
});
const game = (id: string, over: Partial<GameCard> = {}): GameCard => ({
  id,
  kickoff: "2026-10-31T19:30:00Z",
  state: "pre",
  detail: "",
  away: side("Texas A&M Aggies"),
  home: side("Alabama Crimson Tide"),
  venue: { city: null, indoor: false },
  forecast: null,
  lines: lines(-15.5, 54.5),
  ...over,
});

describe("recordOpens", () => {
  it("saves each upcoming game's line as it stands", () => {
    const { opens, added } = recordOpens({}, [game("1")], NOW);
    expect(added).toBe(1);
    expect(opens["1"]).toEqual({ homeSpread: -15.5, total: 54.5, kickoff: "2026-10-31T19:30:00Z" });
  });
  it("never replaces a saved open", () => {
    const first = recordOpens({}, [game("1")], NOW).opens;
    const second = recordOpens(first, [game("1", { lines: lines(-14, 50.5) })], NOW);
    expect(second.added).toBe(0);
    expect(second.opens["1"].homeSpread).toBe(-15.5);
  });
  it("skips games that have started or have no lines", () => {
    const { opens } = recordOpens({}, [game("1", { state: "in" }), game("2", { lines: null })], NOW);
    expect(opens).toEqual({});
  });
  it("falls back to the away spread when the home one is missing", () => {
    const g = game("1", { lines: { ...lines(-3, 45), spread: { away: { line: 3, odds: -110 }, home: null } } });
    expect(recordOpens({}, [g], NOW).opens["1"].homeSpread).toBe(-3);
  });
  it("drops games played more than three weeks ago", () => {
    const old: StoredOpens = { old: { homeSpread: -3, total: 40, kickoff: "2026-09-20T17:00:00Z" } };
    expect(Object.keys(recordOpens(old, [], NOW).opens)).toEqual([]);
  });
});

describe("applyOpens", () => {
  const opens: StoredOpens = { "1": { homeSpread: -15.5, total: 54.5, kickoff: "2026-10-31T19:30:00Z" } };
  it("measures movement from the saved open, not ESPN's", () => {
    const g = applyOpens(game("1", { lines: lines(-14, 50.5) }), opens);
    expect(g.lines!.open).toEqual({ total: 54.5, favorite: "home", spread: -15.5 });
    expect(spreadMove(g.lines!, "home")).toBe(1.5);
    expect(totalMove(g.lines!)).toBe(-4);
  });
  it("reads an away favorite and a pick'em", () => {
    expect(applyOpens(game("1"), { "1": { homeSpread: 3, total: 40, kickoff: "x" } }).lines!.open).toMatchObject({ favorite: "away", spread: -3 });
    expect(applyOpens(game("1"), { "1": { homeSpread: 0, total: 40, kickoff: "x" } }).lines!.open).toMatchObject({ favorite: null });
  });
  it("shows nothing for a game with no saved open", () => {
    const g = applyOpens(game("2"), opens);
    expect(g.lines!.open).toEqual({ total: null, favorite: null, spread: null });
    expect(spreadMove(g.lines!, "home")).toBeNull();
    expect(applyOpens(game("2"), null).lines!.open.total).toBeNull();
  });
  it("leaves a game without lines alone", () => {
    expect(applyOpens(game("1", { lines: null }), opens).lines).toBeNull();
  });
});

describe("isOpenPullTime", () => {
  // Sun 2026-10-25 3am CDT = 08:00 UTC. After daylight saving ends Nov 1, 3am CST = 09:00 UTC.
  it("is Sunday 3am Central for college and Monday 3am for the NFL", () => {
    expect(isOpenPullTime("ncaa", Date.parse("2026-10-25T08:10:00Z"))).toBe(true);
    expect(isOpenPullTime("nfl", Date.parse("2026-10-25T08:10:00Z"))).toBe(false);
    expect(isOpenPullTime("nfl", Date.parse("2026-10-26T08:10:00Z"))).toBe(true);
    expect(isOpenPullTime("ncaa", Date.parse("2026-10-26T08:10:00Z"))).toBe(false);
  });
  it("follows daylight saving", () => {
    expect(isOpenPullTime("ncaa", Date.parse("2026-11-08T08:10:00Z"))).toBe(false); // Sun 2:10am CST
    expect(isOpenPullTime("ncaa", Date.parse("2026-11-08T09:10:00Z"))).toBe(true); // Sun 3:10am CST
    expect(isOpenPullTime("ncaa", Date.parse("2026-10-25T09:10:00Z"))).toBe(false); // Sun 4:10am CDT
  });
});
