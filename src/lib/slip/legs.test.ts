import { describe, expect, it } from "vitest";
import type { GameCard } from "../games/espn-games";
import type { GameProps, PlayerProp } from "../odds/props";
import { blockedBy, conflictKeyOf, factsOfLeg, factsOfSpec, legFromGame, legFromProp, lineIdOf, lineIdOfLeg, type PickSpec } from "./legs";

const NOW = Date.parse("2026-10-18T12:00:00Z");
const side = (name: string) => ({ abbr: "X", name, record: null, rank: null, logo: "", score: null });
const game: GameCard = {
  id: "401",
  kickoff: "2026-10-18T18:00:00Z",
  state: "pre",
  detail: "",
  away: side("Buffalo Bills"),
  home: side("Kansas City Chiefs"),
  venue: { city: null, indoor: false },
  forecast: null,
  lines: {
    spread: { away: { line: 3.5, odds: -110 }, home: { line: -3.5, odds: -110 } },
    total: { over: { line: 47.5, odds: -105 }, under: { line: 47.5, odds: -115 } },
    moneyline: { away: 150, home: -180 },
    open: { total: null, favorite: null, spread: null },
  },
};
const g = (kind: "moneyline" | "spread" | "total", s: "home" | "away" | "over" | "under", point: number | null = null): Extract<PickSpec, { src: "game" }> => ({
  src: "game",
  slate: "nfl",
  gameId: "401",
  kind,
  side: s,
  point,
  away: "Buffalo Bills",
  home: "Kansas City Chiefs",
});

describe("conflictKeyOf", () => {
  it("treats both sides of a spread, and any line on it, as one bet", () => {
    expect(conflictKeyOf(g("spread", "home"))).toBe(conflictKeyOf(g("spread", "away")));
    expect(lineIdOf(g("spread", "home"))).not.toBe(lineIdOf(g("spread", "away")));
  });
  it("keeps different bet types on a game apart", () => {
    expect(conflictKeyOf(g("spread", "home"))).not.toBe(conflictKeyOf(g("moneyline", "home")));
    expect(conflictKeyOf(g("total", "over"))).toBe(conflictKeyOf(g("total", "under")));
  });
  it("is one per player per stat for props", () => {
    const p = (tab: "passing" | "rushing", s: "over" | "under", point: number, player = "Patrick Mahomes"): PickSpec => ({
      src: "prop",
      eventId: "e1",
      tab,
      player,
      point,
      side: s,
      away: "Buffalo Bills",
      home: "Kansas City Chiefs",
    });
    expect(conflictKeyOf(p("passing", "over", 275.5))).toBe(conflictKeyOf(p("passing", "under", 300.5)));
    expect(conflictKeyOf(p("passing", "over", 275.5))).not.toBe(conflictKeyOf(p("rushing", "over", 20.5)));
    expect(conflictKeyOf(p("passing", "over", 275.5))).not.toBe(conflictKeyOf(p("passing", "over", 275.5, "Josh Allen")));
  });
});

describe("lineIdOfLeg", () => {
  it("matches the id of the spec it was built from", () => {
    const spec = g("spread", "away");
    const leg = legFromGame(spec, game, "nfl", "Joe", NOW)!;
    expect(lineIdOfLeg(leg, conflictKeyOf(spec))).toBe(lineIdOf(spec));
  });
});

describe("blockedBy", () => {
  const pick = (spec: PickSpec, name = "Joe") => ({ name, conflictKey: conflictKeyOf(spec), facts: factsOfSpec(spec) });

  it("names who holds the same bet or its other side", () => {
    const others = [pick(g("spread", "home", -3.5))];
    expect(blockedBy(others, g("spread", "away", 3.5))).toEqual({ name: "Joe", contradiction: false });
    expect(blockedBy(others, g("total", "over", 47.5))).toBeNull();
  });
  it("blocks the other team's moneyline against a favorite's spread, both ways round", () => {
    expect(blockedBy([pick(g("spread", "home", -3.5))], g("moneyline", "away"))).toEqual({ name: "Joe", contradiction: true });
    expect(blockedBy([pick(g("moneyline", "away"))], g("spread", "home", -3.5))).toEqual({ name: "Joe", contradiction: true });
  });
  it("leaves the same team's moneyline and an underdog's spread alone", () => {
    expect(blockedBy([pick(g("spread", "home", -3.5))], g("moneyline", "home"))).toBeNull();
    expect(blockedBy([pick(g("spread", "away", 3.5))], g("moneyline", "home"))).toBeNull();
    expect(blockedBy([pick(g("moneyline", "home"))], g("spread", "away", 3.5))).toBeNull();
  });
  it("reads the same facts off a saved leg", () => {
    const leg = legFromGame(g("spread", "home", -3.5), game, "nfl", "Joe", NOW)!;
    expect(blockedBy([{ name: "Joe", conflictKey: conflictKeyOf(g("spread", "home")), facts: factsOfLeg(leg) }], g("moneyline", "away"))).toEqual({
      name: "Joe",
      contradiction: true,
    });
  });
});

describe("legFromGame", () => {
  it("reads the line and price from the scoreboard", () => {
    const leg = legFromGame(g("spread", "away"), game, "nfl", "Joe", NOW)!;
    expect(leg).toMatchObject({ kind: "spread", side: "away", point: 3.5, price: -110, label: "Buffalo Bills +3.5", owner: "Joe" });
    expect(legFromGame(g("total", "under"), game, "nfl", "Joe", NOW)).toMatchObject({ label: "Under 47.5", price: -115 });
    expect(legFromGame(g("moneyline", "home"), game, "nfl", "Joe", NOW)).toMatchObject({ label: "Kansas City Chiefs", price: -180 });
  });
  it("refuses a game that has started", () => {
    expect(legFromGame(g("spread", "away"), game, "nfl", "Joe", Date.parse("2026-10-18T18:00:01Z"))).toBeNull();
    expect(legFromGame(g("spread", "away"), { ...game, state: "in" }, "nfl", "Joe", NOW)).toBeNull();
  });
  it("refuses a side that is not posted", () => {
    const bare = { ...game, lines: { ...game.lines!, moneyline: { away: null, home: null } } };
    expect(legFromGame(g("moneyline", "home"), bare, "nfl", "Joe", NOW)).toBeNull();
  });
});

describe("legFromProp", () => {
  const props: GameProps = {
    eventId: "e1",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    commenceTime: "2026-10-18T18:00:00Z",
    markets: {},
  };
  const yards: PlayerProp = { player: "Patrick Mahomes", point: 275.5, over: -115, under: -105, yes: null };
  const td: PlayerProp = { player: "Travis Kelce", point: null, over: null, under: null, yes: 130 };
  const spec = (tab: "passing" | "tds", s: "over" | "under" | "yes", row: PlayerProp): Extract<PickSpec, { src: "prop" }> => ({
    src: "prop",
    eventId: "e1",
    tab,
    player: row.player,
    point: row.point,
    side: s,
    away: props.awayTeam,
    home: props.homeTeam,
  });

  it("builds an auto-graded yardage leg", () => {
    expect(legFromProp(spec("passing", "under", yards), props, yards, "home", "Joe", NOW)).toMatchObject({
      kind: "prop",
      label: "Patrick Mahomes Under 275.5",
      price: -105,
      team: "Kansas City Chiefs",
      market: "Passing yds",
      prop: { player: "Patrick Mahomes", stat: "pass_yds", side: "under", point: 275.5 },
    });
  });
  it("has the same line id as its spec", () => {
    const s = spec("passing", "under", yards);
    const leg = legFromProp(s, props, yards, undefined, "Joe", NOW)!;
    expect(lineIdOfLeg(leg, conflictKeyOf(s))).toBe(lineIdOf(s));
    const t = spec("tds", "yes", td);
    expect(lineIdOfLeg(legFromProp(t, props, td, undefined, "Joe", NOW)!, conflictKeyOf(t))).toBe(lineIdOf(t));
  });
  it("builds an anytime TD leg", () => {
    expect(legFromProp(spec("tds", "yes", td), props, td, undefined, "Joe", NOW)).toMatchObject({
      label: "Travis Kelce",
      price: 130,
      prop: { player: "Travis Kelce", stat: "anytime_td" },
    });
  });
  it("refuses a side the tab does not have, and a started game", () => {
    expect(legFromProp(spec("passing", "yes", yards), props, yards, undefined, "Joe", NOW)).toBeNull();
    expect(legFromProp(spec("tds", "over", td), props, td, undefined, "Joe", NOW)).toBeNull();
    expect(legFromProp(spec("passing", "over", yards), props, yards, undefined, "Joe", Date.parse("2026-10-18T19:00:00Z"))).toBeNull();
  });
});
