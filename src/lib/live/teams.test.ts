import { describe, expect, it } from "vitest";
import type { GameScore, Leg } from "./grade";
import { matchupLine, nickname, NFL_CODES } from "./teams";

const leg = (home: string, away: string): Leg => ({
  id: "1",
  owner: "t",
  kind: "moneyline",
  label: "",
  sport: "nfl",
  homeTeam: home,
  awayTeam: away,
  matchup: `${away} @ ${home}`,
});
const score = (homeScore: number | null, awayScore: number | null, completed = false): GameScore => ({
  completed,
  homeScore,
  awayScore,
});

describe("nickname", () => {
  it("is the last word of the team name", () => {
    expect(nickname("New England Patriots")).toBe("Patriots");
    expect(nickname("San Francisco 49ers")).toBe("49ers");
    expect(nickname("Washington Commanders")).toBe("Commanders");
  });
});

describe("matchupLine", () => {
  const nepBuf = leg("Buffalo Bills", "New England Patriots");

  it("is nicknames with an @ before the game has a score", () => {
    expect(matchupLine(nepBuf, undefined)).toBe("Patriots @ Bills");
    expect(matchupLine(nepBuf, score(null, null))).toBe("Patriots @ Bills");
  });

  it("is team codes and the score once the game has started, away first", () => {
    expect(matchupLine(nepBuf, score(7, 7))).toBe("NE 7 - 7 BUF");
    expect(matchupLine(nepBuf, score(0, 0))).toBe("NE 0 - 0 BUF");
    expect(matchupLine(leg("Washington Commanders", "Indianapolis Colts"), score(13, 20))).toBe("IND 20 - 13 WSH");
  });

  it("keeps the score on the final", () => {
    expect(matchupLine(nepBuf, score(24, 20, true))).toBe("NE 20 - 24 BUF");
  });

  it("falls back to the nickname for a team with no code, and to the stored text for non-NFL games", () => {
    expect(matchupLine(leg("Buffalo Bills", "Springfield Isotopes"), score(3, 0))).toBe("Isotopes 0 - 3 BUF");
    expect(matchupLine({ ...nepBuf, sport: "ncaaf", matchup: "Pittsburgh @ Virginia Tech" }, undefined)).toBe(
      "Pittsburgh @ Virginia Tech",
    );
    expect(matchupLine({ id: "1", owner: "t", kind: "prop", label: "", sport: "nfl", matchup: "x @ y" }, undefined)).toBe(
      "x @ y",
    );
  });
});

describe("NFL_CODES", () => {
  it("has all 32 teams", () => {
    expect(Object.keys(NFL_CODES)).toHaveLength(32);
  });
});
