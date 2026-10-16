import { describe, expect, it } from "vitest";
import { badges, extremes, standings, streakBadge, type WeekResults } from "./stats";

const weeks: WeekResults[] = [
  { weekNumber: 1, legs: [{ owner: "Joe", result: "hit" }, { owner: "Dane", result: "miss" }] },
  { weekNumber: 2, legs: [{ owner: "Joe", result: "hit" }, { owner: "Dane", result: "push" }] },
  { weekNumber: 3, legs: [{ owner: "joe", result: "miss" }, { owner: "Dane", result: "miss" }] },
];

describe("standings", () => {
  const rows = standings(weeks);
  it("ranks by hit rate and leaves players with no legs last", () => {
    expect(rows[0].name).toBe("Joe");
    expect(rows[0].record).toEqual({ wins: 2, losses: 1, pushes: 0 });
    expect(rows[1].name).toBe("Dane");
    expect(rows[1].record).toEqual({ wins: 0, losses: 2, pushes: 1 });
    expect(rows[rows.length - 1].rate).toBeNull();
  });
  it("finds the best and worst picker", () => {
    const { best, worst } = extremes(rows);
    expect(best.map((r) => r.name)).toEqual(["Joe"]);
    expect(worst.map((r) => r.name)).toEqual(["Dane"]);
  });
  it("lists every player when they tie", () => {
    const tie = standings([{ weekNumber: 1, legs: [{ owner: "Joe", result: "hit" }, { owner: "Ja", result: "hit" }] }]);
    expect(extremes(tie).best.map((r) => r.name).sort()).toEqual(["Ja", "Joe"]);
  });
  it("has no extremes before anything has settled", () => {
    expect(extremes(standings([]))).toEqual({ best: [], worst: [] });
  });
});

describe("streakBadge", () => {
  it("gives fire for three hits in a row and ice for three misses", () => {
    expect(streakBadge(["miss", "hit", "hit", "hit"])).toBe("fire");
    expect(streakBadge(["hit", "miss", "miss", "miss"])).toBe("ice");
  });
  it("only counts the current run", () => {
    expect(streakBadge(["hit", "hit", "hit", "miss"])).toBeNull();
    expect(streakBadge(["hit", "hit"])).toBeNull();
  });
  it("skips pushes without breaking the run", () => {
    expect(streakBadge(["hit", "push", "hit", "hit"])).toBe("fire");
  });
});

describe("badges", () => {
  it("reads legs in week order, whatever order the weeks arrive in", () => {
    const leg = (owner: string, result: string) => ({ owner, result });
    const out = badges([
      { weekNumber: 3, legs: [leg("Joe", "hit"), leg("Dane", "miss")] },
      { weekNumber: 1, legs: [leg("Joe", "hit"), leg("Dane", "miss")] },
      { weekNumber: 2, legs: [leg("joe", "hit"), leg("Dane", "miss")] },
    ]);
    expect(out.get("joe")).toBe("fire");
    expect(out.get("dane")).toBe("ice");
    expect(out.has("ja")).toBe(false);
  });
});
