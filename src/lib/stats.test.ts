import { describe, expect, it } from "vitest";
import { bestAndWorstWeek, extremes, standings, summarizeWeeks, type WeekResults } from "./stats";

const weeks: WeekResults[] = [
  { weekNumber: 1, totalPrice: 100, legs: [{ owner: "Joe", result: "hit" }, { owner: "Dane", result: "miss" }] },
  { weekNumber: 2, totalPrice: 100, legs: [{ owner: "Joe", result: "hit" }, { owner: "Dane", result: "push" }] },
  { weekNumber: 3, totalPrice: null, legs: [{ owner: "joe", result: "miss" }, { owner: "Dane", result: "miss" }] },
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
    const tie = standings([{ weekNumber: 1, totalPrice: null, legs: [{ owner: "Joe", result: "hit" }, { owner: "Ja", result: "hit" }] }]);
    expect(extremes(tie).best.map((r) => r.name).sort()).toEqual(["Ja", "Joe"]);
  });
  it("has no extremes before anything has settled", () => {
    expect(extremes(standings([]))).toEqual({ best: [], worst: [] });
  });
});

describe("weeks", () => {
  it("marks a week lost on any miss and picks best and worst", () => {
    const summaries = summarizeWeeks(weeks);
    expect(summaries.map((s) => s.won)).toEqual([false, true, false]);
    const { best, worst } = bestAndWorstWeek(summaries);
    expect(best?.weekNumber).toBe(2);
    expect(worst?.weekNumber).toBe(3);
  });
});
