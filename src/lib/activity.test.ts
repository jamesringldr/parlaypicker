import { describe, expect, it } from "vitest";
import { timeAgo } from "./activity";

const now = Date.parse("2026-10-16T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const MIN = 60_000;

describe("timeAgo", () => {
  it("says Never with no time", () => {
    expect(timeAgo(null, now)).toBe("Never");
  });
  it("counts minutes, hours and days", () => {
    expect(timeAgo(ago(20_000), now)).toBe("just now");
    expect(timeAgo(ago(5 * MIN), now)).toBe("5 min ago");
    expect(timeAgo(ago(59 * MIN), now)).toBe("59 min ago");
    expect(timeAgo(ago(60 * MIN), now)).toBe("1 h ago");
    expect(timeAgo(ago(23 * 60 * MIN), now)).toBe("23 h ago");
    expect(timeAgo(ago(24 * 60 * MIN), now)).toBe("1 day ago");
    expect(timeAgo(ago(3 * 24 * 60 * MIN), now)).toBe("3 days ago");
  });
});
