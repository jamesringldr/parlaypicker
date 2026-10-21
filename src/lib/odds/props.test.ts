import { describe, expect, it } from "vitest";
import { findGameProps, isPullTime, isTuesday, playerIndex, searchPlayers, shortName, toGameProps, topProps, type GameProps } from "./props";
import type { EventOdds } from "./types";

const event = (markets: EventOdds["markets"]): EventOdds => ({
  id: "g1",
  sport: "nfl",
  commenceTime: "2026-10-18T17:00:00Z",
  homeTeam: "Atlanta Falcons",
  awayTeam: "Chicago Bears",
  bookmaker: "FanDuel",
  markets,
});

describe("toGameProps", () => {
  it("lines up each player's over and under", () => {
    const g = toGameProps(
      event([
        {
          key: "player_rush_yds",
          outcomes: [
            { name: "Over", description: "Bijan Robinson", price: -115, point: 79.5 },
            { name: "Under", description: "Bijan Robinson", price: -105, point: 79.5 },
            { name: "Over", description: "D'Andre Swift", price: -110, point: 61.5 },
          ],
        },
      ]),
    );
    expect(g.markets.player_rush_yds).toEqual([
      { player: "Bijan Robinson", point: 79.5, over: -115, under: -105, yes: null },
      { player: "D'Andre Swift", point: 61.5, over: -110, under: null, yes: null },
    ]);
  });

  it("reads anytime TD prices and drops rows with nothing to bet", () => {
    const g = toGameProps(
      event([
        {
          key: "player_anytime_td",
          outcomes: [
            { name: "Yes", description: "Bijan Robinson", price: -120 },
            { name: "No", description: "Caleb Williams", price: 130 },
          ],
        },
      ]),
    );
    expect(g.markets.player_anytime_td).toEqual([{ player: "Bijan Robinson", point: null, over: null, under: null, yes: -120 }]);
  });

  it("ignores markets that aren't props and outcomes with no player", () => {
    const g = toGameProps(event([{ key: "h2h", outcomes: [{ name: "Chicago Bears", price: -110 }] }]));
    expect(g.markets).toEqual({});
  });
});

describe("isPullTime", () => {
  // Wed 2026-10-21 12:30 CDT = 17:30 UTC. After daylight saving ends Nov 1, noon CST = 18:00 UTC.
  it("is true at noon Central on Tue, Wed and Thu", () => {
    expect(isPullTime(Date.parse("2026-10-20T17:30:00Z"))).toBe(true);
    expect(isPullTime(Date.parse("2026-10-21T17:30:00Z"))).toBe(true);
    expect(isPullTime(Date.parse("2026-10-22T17:59:00Z"))).toBe(true);
  });
  it("follows daylight saving", () => {
    expect(isPullTime(Date.parse("2026-11-03T17:30:00Z"))).toBe(false); // Tue 11:30 CST
    expect(isPullTime(Date.parse("2026-11-03T18:30:00Z"))).toBe(true); // Tue 12:30 CST
    expect(isPullTime(Date.parse("2026-10-20T18:30:00Z"))).toBe(false); // Tue 1:30pm CDT
  });
  it("is false on other days", () => {
    expect(isPullTime(Date.parse("2026-10-19T17:30:00Z"))).toBe(false); // Mon
    expect(isPullTime(Date.parse("2026-10-23T17:30:00Z"))).toBe(false); // Fri
    expect(isPullTime(Date.parse("2026-10-18T17:30:00Z"))).toBe(false); // Sun
  });
});

describe("isTuesday", () => {
  it("goes by Central time", () => {
    expect(isTuesday(Date.parse("2026-10-20T17:30:00Z"))).toBe(true); // Tue noon CDT
    expect(isTuesday(Date.parse("2026-10-21T03:00:00Z"))).toBe(true); // Tue 10pm CDT, already Wed in UTC
    expect(isTuesday(Date.parse("2026-10-21T17:30:00Z"))).toBe(false); // Wed
  });
});

const names = ["Bijan Robinson", "D'Andre Swift", "Marvin Harrison Jr.", "Brenton Strange", "Brian Thomas Jr", "Josh Allen", "Josh Jacobs", "Allen Lazard"];

describe("searchPlayers", () => {
  it("matches a first name, a last name, or both as you type", () => {
    expect(searchPlayers(names, "bij")).toEqual(["Bijan Robinson"]);
    expect(searchPlayers(names, "robinson")).toEqual(["Bijan Robinson"]);
    expect(searchPlayers(names, "bijan rob")).toEqual(["Bijan Robinson"]);
    expect(searchPlayers(names, "ROBIN")).toEqual(["Bijan Robinson"]);
  });

  it("ignores punctuation, so no apostrophe is needed", () => {
    expect(searchPlayers(names, "dandre")).toEqual(["D'Andre Swift"]);
    expect(searchPlayers(names, "harrison jr")).toEqual(["Marvin Harrison Jr."]);
  });

  it("lists first-name matches before last-name matches", () => {
    expect(searchPlayers(names, "allen")).toEqual(["Allen Lazard", "Josh Allen"]);
  });

  it("needs every word to match and returns nothing for an empty box", () => {
    expect(searchPlayers(names, "josh swift")).toEqual([]);
    expect(searchPlayers(names, "  ")).toEqual([]);
  });

  it("caps the list", () => {
    expect(searchPlayers(names, "b", 2)).toHaveLength(2);
  });
});

const game = (id: string, markets: GameProps["markets"]): GameProps => ({
  eventId: id,
  homeTeam: "Atlanta Falcons",
  awayTeam: "Chicago Bears",
  commenceTime: "2026-10-18T17:00:00Z",
  markets,
});
const row = (player: string, point: number | null, over: number | null, yes: number | null = null) => ({ player, point, over, under: null, yes });

describe("topProps", () => {
  const games = [
    game("a", {
      player_rush_yds: [row("A", 50.5, -110), row("B", 90.5, -110)],
      player_anytime_td: [row("A", null, null, 150), row("B", null, null, -120)],
    }),
    game("b", { player_rush_yds: [row("C", 70.5, -110)] }),
  ];
  it("ranks yardage by the biggest line across games and takes the first n", () => {
    expect(topProps(games, "rushing", 2).map((r) => r.prop.player)).toEqual(["B", "C"]);
  });
  it("ranks anytime TD by shortest price", () => {
    expect(topProps(games, "tds").map((r) => r.prop.player)).toEqual(["B", "A"]);
  });
  it("is empty for a market nobody posted", () => {
    expect(topProps(games, "passing")).toEqual([]);
  });
});

describe("playerIndex and findGameProps", () => {
  const games = [game("a", { player_rush_yds: [row("Bijan Robinson", 79.5, -115)], player_anytime_td: [row("Bijan Robinson", null, null, -120)] })];
  it("gathers one entry per player across markets", () => {
    const [p] = playerIndex(games);
    expect(p.name).toBe("Bijan Robinson");
    expect(Object.keys(p.props).sort()).toEqual(["rushing", "tds"]);
  });
  it("finds a game by its teams", () => {
    expect(findGameProps(games, "Chicago Bears", "Atlanta Falcons")?.eventId).toBe("a");
    expect(findGameProps(games, "Chicago Bears", "Detroit Lions")).toBeUndefined();
  });
});

describe("shortName", () => {
  it("is first initial and last name", () => {
    expect(shortName("Bijan Robinson")).toBe("B. Robinson");
    expect(shortName("D'Andre Swift")).toBe("D. Swift");
    expect(shortName("CeeDee Lamb")).toBe("C. Lamb");
  });
  it("keeps suffixes and multi-word last names", () => {
    expect(shortName("Marvin Harrison Jr.")).toBe("M. Harrison Jr.");
    expect(shortName("Kenneth Walker III")).toBe("K. Walker III");
    expect(shortName("Amon-Ra St. Brown")).toBe("A. St. Brown");
  });
  it("leaves names that start with initials, single names and defenses sensible", () => {
    expect(shortName("C.J. Stroud")).toBe("C.J. Stroud");
    expect(shortName("Madonna")).toBe("Madonna");
    expect(shortName("Chicago Bears Defense")).toBe("Defense");
  });
});
