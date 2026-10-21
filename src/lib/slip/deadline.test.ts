import { describe, expect, it } from "vitest";
import { pickDeadline } from "./deadline";

const iso = (ms: number) => new Date(ms).toISOString();

describe("pickDeadline", () => {
  // Thu 2026-10-22 5pm CDT = 22:00 UTC.
  it("is the coming Thursday 5pm Central from Tuesday to Thursday", () => {
    expect(iso(pickDeadline(Date.parse("2026-10-20T17:00:00Z")))).toBe("2026-10-22T22:00:00.000Z"); // Tue noon
    expect(iso(pickDeadline(Date.parse("2026-10-21T15:00:00Z")))).toBe("2026-10-22T22:00:00.000Z"); // Wed
    expect(iso(pickDeadline(Date.parse("2026-10-22T21:59:00Z")))).toBe("2026-10-22T22:00:00.000Z"); // Thu 4:59pm
  });
  it("stays on that Thursday after it passes, until the next Tuesday", () => {
    expect(iso(pickDeadline(Date.parse("2026-10-22T22:01:00Z")))).toBe("2026-10-22T22:00:00.000Z"); // Thu 5:01pm
    expect(iso(pickDeadline(Date.parse("2026-10-25T18:00:00Z")))).toBe("2026-10-22T22:00:00.000Z"); // Sun
    expect(iso(pickDeadline(Date.parse("2026-10-27T03:00:00Z")))).toBe("2026-10-22T22:00:00.000Z"); // Mon 10pm CDT
    expect(iso(pickDeadline(Date.parse("2026-10-27T06:00:00Z")))).toBe("2026-10-29T22:00:00.000Z"); // Tue 1am CDT
  });
  it("follows daylight saving", () => {
    // DST ends Sun Nov 1, so Thu Nov 5 5pm is CST = 23:00 UTC.
    expect(iso(pickDeadline(Date.parse("2026-11-04T18:00:00Z")))).toBe("2026-11-05T23:00:00.000Z");
    // Thu Oct 29 is still CDT.
    expect(iso(pickDeadline(Date.parse("2026-10-28T18:00:00Z")))).toBe("2026-10-29T22:00:00.000Z");
  });
  it("crosses a month end", () => {
    // Tue Dec 29 2026 -> Thu Dec 31.
    expect(iso(pickDeadline(Date.parse("2026-12-30T18:00:00Z")))).toBe("2026-12-31T23:00:00.000Z");
    // Sat Jan 2 2027 is still the week of Thu Dec 31.
    expect(iso(pickDeadline(Date.parse("2027-01-02T18:00:00Z")))).toBe("2026-12-31T23:00:00.000Z");
  });
});
