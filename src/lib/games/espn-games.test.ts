import { describe, expect, it } from "vitest";
import { parseGames, parseWeekNumber } from "./espn-games";

const side = (homeAway: string, abbr: string, record: string, score = "0") => ({
  homeAway,
  score,
  records: [{ type: "total", summary: record }],
  team: { abbreviation: abbr, displayName: abbr, logoDark: `https://x/${abbr}.png` },
});

const odds = {
  pointSpread: {
    home: { close: { line: "-2.5", odds: "-115" }, open: { line: "+1.5", odds: "-118" } },
    away: { close: { line: "+2.5", odds: "-105" } },
  },
  total: {
    over: { close: { line: "o42.5", odds: "-112" }, open: { line: "o41.5", odds: "-110" } },
    under: { close: { line: "u42.5", odds: "-108" } },
  },
  moneyline: { home: { close: { odds: "-142" } }, away: { close: { odds: "+120" } } },
};

const event = (state: string, o?: unknown) => ({
  id: "1",
  date: "2026-10-18T13:30Z",
  status: { type: { state, shortDetail: state === "post" ? "Final" : "Q3 - 7:58" } },
  competitions: [{ competitors: [side("home", "JAX", "4-1"), side("away", "HOU", "1-4")], odds: o ? [o] : undefined }],
});

describe("parseGames", () => {
  it("reads teams, records and kickoff", () => {
    const [g] = parseGames({ events: [event("pre", odds)] });
    expect(g.home).toMatchObject({ abbr: "JAX", record: "4-1", logo: "https://x/JAX.png" });
    expect(g.away.abbr).toBe("HOU");
    expect(g.state).toBe("pre");
    expect(g.detail).toBe("");
  });

  it("reads the closing lines with their signs and prices", () => {
    const { lines } = parseGames({ events: [event("pre", odds)] })[0];
    expect(lines?.spread.home).toEqual({ line: -2.5, odds: -115 });
    expect(lines?.spread.away).toEqual({ line: 2.5, odds: -105 });
    expect(lines?.total.over).toEqual({ line: 42.5, odds: -112 });
    expect(lines?.total.under).toEqual({ line: 42.5, odds: -108 });
    expect(lines?.moneyline).toEqual({ away: 120, home: -142 });
  });

  it("works out who was favored at the open", () => {
    const { lines } = parseGames({ events: [event("pre", odds)] })[0];
    expect(lines?.open).toEqual({ total: 41.5, favorite: "away", spread: -1.5 });
  });

  it("has no lines when ESPN sends none", () => {
    expect(parseGames({ events: [event("post")] })[0].lines).toBeNull();
  });

  it("carries the live or final status text", () => {
    expect(parseGames({ events: [event("in")] })[0]).toMatchObject({ state: "in", detail: "Q3 - 7:58" });
    expect(parseGames({ events: [event("post")] })[0]).toMatchObject({ state: "post", detail: "Final" });
  });

  it("skips a malformed event instead of throwing", () => {
    expect(parseGames({ events: [{ id: "x" }, null, event("pre")] })).toHaveLength(1);
    expect(parseGames(null)).toEqual([]);
  });
});

describe("parseWeekNumber", () => {
  it("reads the week", () => {
    expect(parseWeekNumber({ week: { number: 6 } })).toBe(6);
    expect(parseWeekNumber({})).toBeNull();
  });
});
