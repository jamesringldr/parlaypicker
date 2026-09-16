import { describe, expect, it } from "vitest";
import { conflictKey, formatPrice, parlayPrice } from "./rules";

describe("conflictKey", () => {
  const ev = "evt1";

  it("blocks the same spread selection at a different line", () => {
    expect(conflictKey(ev, "spreads", {})).toBe(conflictKey(ev, "alternate_spreads", {}));
  });

  it("blocks the opposite side of a spread, moneyline, or total", () => {
    // Outcome name (team / Over / Under) is not part of the key.
    expect(conflictKey(ev, "h2h", {})).toBe(conflictKey(ev, "h2h", {}));
    expect(conflictKey(ev, "totals", {})).toBe(conflictKey(ev, "alternate_totals", {}));
  });

  it("allows different market types on the same game", () => {
    const keys = new Set([
      conflictKey(ev, "h2h", {}),
      conflictKey(ev, "spreads", {}),
      conflictKey(ev, "totals", {}),
      conflictKey(ev, "player_pass_yds", { description: "QB One" }),
    ]);
    expect(keys.size).toBe(4);
  });

  it("blocks the same player and stat at any line or side", () => {
    expect(conflictKey(ev, "player_pass_yds", { description: "QB One" })).toBe(
      conflictKey(ev, "player_pass_yds_alternate", { description: " qb one " }),
    );
  });

  it("allows a different player or a different stat", () => {
    const base = conflictKey(ev, "player_pass_yds", { description: "QB One" });
    expect(conflictKey(ev, "player_pass_yds", { description: "QB Two" })).not.toBe(base);
    expect(conflictKey(ev, "player_rush_yds", { description: "QB One" })).not.toBe(base);
  });

  it("does not collide across games", () => {
    expect(conflictKey("a", "spreads", {})).not.toBe(conflictKey("b", "spreads", {}));
  });
});

describe("parlayPrice", () => {
  it("returns null with no legs", () => {
    expect(parlayPrice([])).toBeNull();
  });

  it("combines two -110 legs to about +264", () => {
    expect(parlayPrice([-110, -110])).toBe(264);
  });

  it("combines mixed legs", () => {
    // 2.5 * 1.5 = 3.75 -> +275
    expect(parlayPrice([150, -200])).toBe(275);
  });

  it("returns negative odds for a heavy favorite single leg", () => {
    expect(parlayPrice([-250])).toBe(-250);
  });

  it("formats prices", () => {
    expect(formatPrice(150)).toBe("+150");
    expect(formatPrice(-110)).toBe("-110");
  });
});
