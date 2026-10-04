import { describe, expect, it } from "vitest";
import { gameIsLive, gradeLeg, normName, parlayState, type BoxScore, type GameScore, type Leg } from "./grade";

const base: Leg = {
  id: "1",
  owner: "Sam",
  kind: "moneyline",
  label: "x",
  sport: "nfl",
  eventId: "e1",
  homeTeam: "Chiefs",
  awayTeam: "Bills",
};

const final = (homeScore: number, awayScore: number): GameScore => ({ completed: true, homeScore, awayScore });
const live = (homeScore: number, awayScore: number, elapsed?: number): GameScore => ({
  completed: false,
  homeScore,
  awayScore,
  elapsed,
});

describe("gradeLeg", () => {
  it("is pending with no score", () => {
    expect(gradeLeg({ ...base, side: "home" }, undefined).state).toBe("pending");
    expect(gradeLeg({ ...base, side: "home" }, { completed: false, homeScore: null, awayScore: null }).state).toBe(
      "pending",
    );
  });

  it("grades moneyline", () => {
    expect(gradeLeg({ ...base, side: "home" }, final(24, 20)).state).toBe("hit");
    expect(gradeLeg({ ...base, side: "away" }, final(24, 20)).state).toBe("miss");
    expect(gradeLeg({ ...base, side: "home" }, final(20, 20)).state).toBe("push");
  });

  it("grades spread using the signed line for the picked team", () => {
    const chiefsMinus35 = { ...base, kind: "spread" as const, side: "home" as const, point: -3.5 };
    expect(gradeLeg(chiefsMinus35, final(23, 20)).state).toBe("miss");
    expect(gradeLeg(chiefsMinus35, final(24, 20)).state).toBe("hit");
    const billsPlus35 = { ...base, kind: "spread" as const, side: "away" as const, point: 3.5 };
    expect(gradeLeg(billsPlus35, final(23, 20)).state).toBe("hit");
    expect(gradeLeg(billsPlus35, final(24, 20)).state).toBe("miss");
    expect(gradeLeg({ ...chiefsMinus35, point: -4 }, final(24, 20)).state).toBe("push");
  });

  it("grades totals", () => {
    const over = { ...base, kind: "total" as const, side: "over" as const, point: 43.5 };
    expect(gradeLeg(over, final(24, 20)).state).toBe("hit");
    expect(gradeLeg({ ...over, side: "under" }, final(24, 20)).state).toBe("miss");
    expect(gradeLeg({ ...over, point: 44 }, final(24, 20)).state).toBe("push");
  });

  it("shows winning/losing while a game is live, then settles at the final", () => {
    const leg = { ...base, side: "home" as const };
    expect(gradeLeg(leg, live(7, 3)).state).toBe("winning");
    expect(gradeLeg(leg, live(3, 7)).state).toBe("losing");
    expect(gradeLeg(leg, final(3, 7)).state).toBe("miss");
  });

  it("props are pending until marked by hand, and a hand mark beats the auto grade", () => {
    const prop = { ...base, kind: "prop" as const };
    expect(gradeLeg(prop, undefined).state).toBe("pending");
    expect(gradeLeg({ ...prop, manual: "hit" }, undefined).state).toBe("hit");
    expect(gradeLeg({ ...base, side: "home", manual: "miss" }, final(24, 20)).state).toBe("miss");
  });
});

describe("parlayState", () => {
  const g = (state: "hit" | "miss" | "push" | "pending") => ({ state, detail: "" });

  it("is dead on any miss, even with legs still pending", () => {
    expect(parlayState([g("hit"), g("miss"), g("pending")])).toBe("dead");
  });
  it("is won only when every leg hit or pushed", () => {
    expect(parlayState([g("hit"), g("push")])).toBe("won");
    expect(parlayState([g("hit"), g("pending")])).toBe("alive");
    expect(parlayState([])).toBe("alive");
  });
});

describe("player props", () => {
  const box = (over: Partial<BoxScore> = {}): BoxScore => ({
    rush: new Map([["james cook", 54]]),
    rec: new Map(),
    pass: new Map(),
    tdPlays: [],
    ...over,
  });
  const cook = (point: number, side: "over" | "under" = "over"): Leg => ({
    ...base,
    kind: "prop",
    prop: { player: "James Cook", stat: "rush_yds", side, point },
  });
  const td = (player: string): Leg => ({ ...base, kind: "prop", prop: { player, stat: "anytime_td" } });

  it("waits for kickoff and for stats", () => {
    expect(gradeLeg(cook(87.5), undefined, undefined).detail).toBe("Not started");
    expect(gradeLeg(cook(87.5), live(10, 7), undefined).detail).toMatch(/unavailable/);
  });

  it("an over is winning once past the line but only settles at the final", () => {
    expect(gradeLeg(cook(87.5), live(10, 7), box()).state).toBe("pending");
    expect(gradeLeg(cook(87.5), live(10, 7), box({ rush: new Map([["james cook", 90]]) })).state).toBe("winning");
    expect(gradeLeg(cook(87.5), final(10, 7), box({ rush: new Map([["james cook", 90]]) })).state).toBe("hit");
    expect(gradeLeg(cook(87.5), final(10, 7), box()).state).toBe("miss");
    expect(gradeLeg(cook(54), final(10, 7), box()).state).toBe("push");
  });

  it("an under busts once past the line and settles at the final", () => {
    expect(gradeLeg(cook(40, "under"), live(10, 7), box()).state).toBe("losing");
    expect(gradeLeg(cook(87.5, "under"), final(10, 7), box()).state).toBe("hit");
  });

  describe("pace", () => {
    // Cook has 54 yards. Against 87.5 that's 62% of the line.
    it("an over behind the share of the game played is off pace", () => {
      const g = gradeLeg(cook(87.5), live(10, 7, 0.73), box());
      expect(g).toMatchObject({ state: "losing", label: "Off pace" });
      expect(g.detail).toBe("Live: 54 of 87.5 rush yds (62% of line, 73% of game)");
    });

    it("an over ahead of the share of the game played is on pace", () => {
      expect(gradeLeg(cook(87.5), live(10, 7, 0.5), box())).toMatchObject({ state: "winning", label: "On pace" });
      expect(gradeLeg(cook(87.5), live(10, 7, 0.6), box()).state).toBe("winning");
      expect(gradeLeg(cook(87.5), live(10, 7, 54 / 87.5), box()).state).toBe("winning"); // exactly tied counts as on pace
    });

    it("an under is the mirror image", () => {
      expect(gradeLeg(cook(87.5, "under"), live(10, 7, 0.73), box())).toMatchObject({ state: "winning", label: "On pace" });
      expect(gradeLeg(cook(87.5, "under"), live(10, 7, 0.5), box())).toMatchObject({ state: "losing", label: "Off pace" });
    });

    it("waits until enough of the game is gone, and for a source with a clock", () => {
      expect(gradeLeg(cook(87.5), live(10, 7, 0.1), box()).state).toBe("pending");
      expect(gradeLeg(cook(87.5, "under"), live(10, 7, 0.1), box()).state).toBe("pending");
      expect(gradeLeg(cook(87.5), live(10, 7, undefined), box()).state).toBe("pending");
    });

    it("past the line beats pace in both directions", () => {
      const past = box({ rush: new Map([["james cook", 90]]) });
      expect(gradeLeg(cook(87.5), live(10, 7, 0.1), past)).toMatchObject({ state: "winning", label: "Over the line" });
      expect(gradeLeg(cook(87.5, "under"), live(10, 7, 0.9), past)).toMatchObject({ state: "losing", label: "Over the line" });
    });

    it("never settles before the final, however far behind", () => {
      expect(gradeLeg(cook(200), live(10, 7, 0.99), box()).state).toBe("losing");
      expect(gradeLeg(cook(200), final(10, 7), box()).state).toBe("miss");
    });

    it("leaves touchdown props alone", () => {
      const td: Leg = { ...base, kind: "prop", prop: { player: "Nobody", stat: "anytime_td" } };
      expect(gradeLeg(td, live(10, 7, 0.9), box()).state).toBe("pending");
    });
  });

  it("a player with no stat line has 0 yards", () => {
    expect(gradeLeg(cook(10), final(10, 7), box({ rush: new Map() })).state).toBe("miss");
  });

  it("anytime TD hits as soon as the player scores, even mid-game", () => {
    const scored = box({ tdPlays: ["kenneth walker 4 yd run (kick)"] });
    expect(gradeLeg(td("Kenneth Walker III"), live(10, 7), scored).state).toBe("hit");
    expect(gradeLeg(td("Kenneth Walker III"), live(10, 7), box()).state).toBe("pending");
    expect(gradeLeg(td("Kenneth Walker III"), final(10, 7), box()).state).toBe("miss");
  });

  it("anytime TD does not credit the quarterback on a passing score", () => {
    const passing = box({ tdPlays: ["tyler warren 12 yd pass from daniel jones (kick)"] });
    expect(gradeLeg(td("Tyler Warren"), live(10, 7), passing).state).toBe("hit");
    expect(gradeLeg(td("Daniel Jones"), final(10, 7), passing).state).toBe("miss");
  });

  it("a hand mark still wins", () => {
    expect(gradeLeg({ ...cook(87.5), manual: "miss" }, final(10, 7), box({ rush: new Map([["james cook", 99]]) })).state).toBe("miss");
  });
});

describe("normName", () => {
  it("ignores suffixes, case, and punctuation", () => {
    expect(normName("Kenneth Walker III")).toBe("kenneth walker");
    expect(normName("Marvin Harrison Jr.")).toBe("marvin harrison");
    expect(normName("D'Andre  Swift")).toBe("dandre swift");
  });
});

describe("live clock", () => {
  it("shows the game clock when the source has one", () => {
    const leg = { ...base, side: "home" as const };
    expect(gradeLeg(leg, { ...live(7, 3), clock: "Halftime" }).detail).toMatch(/^Live \(Halftime\):/);
  });
});

describe("gameIsLive", () => {
  it("is true only between kickoff and the final", () => {
    expect(gameIsLive(undefined)).toBe(false);
    expect(gameIsLive({ completed: false, homeScore: null, awayScore: null })).toBe(false); // not kicked off
    expect(gameIsLive({ completed: false, homeScore: 0, awayScore: 0 })).toBe(true); // just kicked off
    expect(gameIsLive({ completed: false, homeScore: 7, awayScore: 3 })).toBe(true);
    expect(gameIsLive({ completed: true, homeScore: 24, awayScore: 20 })).toBe(false);
  });
});
