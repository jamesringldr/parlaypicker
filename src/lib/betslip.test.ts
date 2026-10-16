import { describe, expect, it } from "vitest";
import { slipRows, type SlipLeg } from "./betslip";

const leg = (owner: string, status: SlipLeg["status"]): SlipLeg => ({ id: `${owner}-${status}`, owner, label: "x", status });

describe("slipRows", () => {
  it("sorts missing, then misses, open, hits, pushes", () => {
    const rows = slipRows([
      leg("Joe", "push"),
      leg("Dane", "hit"),
      leg("Ja", "open"),
      leg("John", "miss"),
      leg("Aaron", "hit"),
    ]);
    const order = rows.map((r) => r.status);
    const first = (s: string) => order.indexOf(s as never);
    expect(first("missing")).toBe(0);
    expect(first("miss")).toBeLessThan(first("open"));
    expect(first("open")).toBeLessThan(first("hit"));
    expect(first("hit")).toBeLessThan(first("push"));
    expect(order[order.length - 1]).toBe("push");
  });

  it("gives every player without a pick a missing row", () => {
    const rows = slipRows([leg("Joe", "hit")]);
    expect(rows).toHaveLength(12);
    expect(rows.filter((r) => r.status === "missing")).toHaveLength(11);
    expect(rows.find((r) => r.slug === "joe")?.status).toBe("hit");
  });

  it("matches owners ignoring case and skips unknown owners", () => {
    const rows = slipRows([leg("rodgers", "miss"), leg("TBD", "hit")]);
    expect(rows.find((r) => r.slug === "rodgers")?.status).toBe("miss");
    expect(rows.some((r) => r.status === "hit")).toBe(false);
  });

  it("lists a player once per pick, ties by name", () => {
    const rows = slipRows([leg("Joe", "hit"), { ...leg("Joe", "hit"), id: "second" }, leg("Ja", "hit")]);
    const hits = rows.filter((r) => r.status === "hit").map((r) => r.name);
    expect(hits).toEqual(["Ja", "Joe", "Joe"]);
  });
});
