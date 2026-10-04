import { describe, expect, it } from "vitest";
import { toEventOdds, type OddsApiEventOdds } from "./map";

const event: OddsApiEventOdds = {
  id: "evt1",
  commence_time: "2026-10-04T17:00:00Z",
  home_team: "Kansas City Chiefs",
  away_team: "Buffalo Bills",
  bookmakers: [
    {
      key: "draftkings",
      title: "DraftKings",
      markets: [{ key: "h2h", outcomes: [{ name: "Kansas City Chiefs", price: -200 }] }],
    },
    {
      key: "fanduel",
      title: "FanDuel",
      markets: [
        {
          key: "player_pass_yds",
          outcomes: [
            { name: "Over", description: "Josh Allen", price: -115, point: 275.5 },
            { name: "Under", description: "Josh Allen", price: -105, point: 275.5 },
            { name: "Over", description: "No Price" },
          ],
        },
        {
          key: "h2h",
          outcomes: [
            { name: "Kansas City Chiefs", price: -150 },
            { name: "Buffalo Bills", price: 130 },
          ],
        },
        {
          key: "spreads",
          outcomes: [{ name: "Broken", price: undefined }],
        },
      ],
    },
  ],
};

describe("toEventOdds", () => {
  const odds = toEventOdds("nfl", event);

  it("keeps FanDuel and drops other books", () => {
    expect(odds.bookmaker).toBe("FanDuel");
    expect(odds.markets.map((m) => m.key)).toEqual(["h2h", "player_pass_yds"]);
  });

  it("maps the game and American prices", () => {
    expect(odds).toMatchObject({
      id: "evt1",
      sport: "nfl",
      commenceTime: "2026-10-04T17:00:00Z",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Buffalo Bills",
    });
    expect(odds.markets[1]?.outcomes[0]).toEqual({
      name: "Over",
      description: "Josh Allen",
      price: -115,
      point: 275.5,
    });
  });

  it("drops outcomes with no price and markets with nothing left", () => {
    const pass = odds.markets.find((m) => m.key === "player_pass_yds");
    expect(pass?.outcomes).toHaveLength(2);
    expect(odds.markets.some((m) => m.key === "spreads")).toBe(false);
  });

  it("returns an empty FanDuel board when that book is missing", () => {
    const empty = toEventOdds("ncaaf", { ...event, bookmakers: [] });
    expect(empty.bookmaker).toBe("FanDuel");
    expect(empty.markets).toEqual([]);
    expect(empty.sport).toBe("ncaaf");
  });
});
