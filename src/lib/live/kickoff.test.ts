import { describe, expect, it } from "vitest";
import { kickoffLabel } from "./kickoff";

const MIN = 60 * 1000;
const kickoff = Date.parse("2026-10-04T17:00:00Z");
const scheduled = "Sun, Oct 4, 12:00 PM CT";
const at = (msFromKickoff: number, extra: { live?: string; final?: boolean } = {}) =>
  kickoffLabel({ now: kickoff + msFromKickoff, kickoff, scheduled, final: false, ...extra });

describe("kickoffLabel", () => {
  it("shows the scheduled time until five minutes out", () => {
    expect(at(-2 * 60 * 60 * 1000)).toBe(scheduled);
    expect(at(-5 * MIN - 1)).toBe(scheduled);
  });

  it("counts down inside the last five minutes", () => {
    expect(at(-5 * MIN)).toBe("Kickoff in 5:00");
    expect(at(-4 * MIN - 32 * 1000)).toBe("Kickoff in 4:32");
    expect(at(-9 * 1000)).toBe("Kickoff in 0:09");
    expect(at(-500)).toBe("Kickoff in 0:01");
  });

  it("says Kickoff at the moment of kickoff, before the feed reports a clock", () => {
    expect(at(0)).toBe("Kickoff");
    expect(at(3 * MIN)).toBe("Kickoff");
  });

  it("switches to the game clock once the game is on", () => {
    expect(at(20 * MIN, { live: "Q1 · 9:12" })).toBe("Q1 · 9:12");
    expect(at(-2 * MIN, { live: "Q1 · 15:00" })).toBe("Q1 · 15:00");
  });

  it("says Final, and a delayed game with no feed goes back to the scheduled time", () => {
    expect(at(3 * 60 * 60 * 1000, { final: true })).toBe("Final");
    expect(at(2 * 60 * MIN)).toBe(scheduled);
  });
});
