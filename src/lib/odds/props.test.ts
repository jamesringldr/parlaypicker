import { describe, expect, it } from "vitest";
import { isPullTime, toGameProps } from "./props";
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
