import { describe, expect, it } from "vitest";
import { gradeLeg, parlayState, type GameScore, type Leg } from "./grade";

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
const live = (homeScore: number, awayScore: number): GameScore => ({ completed: false, homeScore, awayScore });

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
