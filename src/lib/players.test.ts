import { describe, expect, it } from "vitest";
import { formatRecord, hitRate, sameOwner, tally } from "./players";

describe("tally", () => {
  it("counts pushes apart from wins and losses and ignores open legs", () => {
    const record = tally(["hit", "miss", "miss", "push", "pending", "hit", "hit"]);
    expect(record).toEqual({ wins: 3, losses: 2, pushes: 1 });
    expect(formatRecord(record)).toBe("3-2-1");
  });
});

describe("hitRate", () => {
  it("leaves pushes out of the rate", () => {
    expect(hitRate({ wins: 3, losses: 1, pushes: 5 })).toBe(0.75);
  });
  it("is null with nothing decided", () => {
    expect(hitRate({ wins: 0, losses: 0, pushes: 2 })).toBeNull();
  });
});

describe("sameOwner", () => {
  it("ignores case and spacing", () => {
    expect(sameOwner(" Rodgers", "rodgers")).toBe(true);
    expect(sameOwner("Dane", "Joe")).toBe(false);
  });
});
