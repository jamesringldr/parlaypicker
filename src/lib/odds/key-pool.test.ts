import { describe, expect, it } from "vitest";
import { OddsApiError, orderPool, withFallback, type PooledKey } from "./key-pool";

const ok = (value: string, remaining: number | null) => async () => ({ value, remaining });

describe("orderPool", () => {
  it("puts the key with the most credits first and unknown last", () => {
    const pool: PooledKey[] = [
      { key: "a", remaining: 100 },
      { key: "b", remaining: null },
      { key: "c", remaining: 400 },
    ];
    expect(orderPool(pool).map((p) => p.key)).toEqual(["c", "a", "b"]);
  });
});

describe("withFallback", () => {
  it("uses the first key and records what it has left", async () => {
    const pool: PooledKey[] = [{ key: "a", remaining: 100 }, { key: "b", remaining: 100 }];
    const used: string[] = [];
    const result = await withFallback(pool, 4, async (key) => {
      used.push(key);
      return { value: "done", remaining: 96 };
    });
    expect(result).toBe("done");
    expect(used).toEqual(["a"]);
    expect(pool[0].remaining).toBe(96);
  });

  it("moves to the next key when one is rejected, and stops using the bad one", async () => {
    const pool: PooledKey[] = [{ key: "a", remaining: 50 }, { key: "b", remaining: 50 }];
    const used: string[] = [];
    const call = async (key: string) => {
      used.push(key);
      if (key === "a") throw new OddsApiError("out of credits", 401);
      return { value: "from b", remaining: 46 };
    };
    expect(await withFallback(pool, 4, call)).toBe("from b");
    expect(pool[0].remaining).toBe(0);
    used.length = 0;
    await withFallback(pool, 4, call);
    expect(used).toEqual(["b"]); // a is skipped now
  });

  it("skips a key that can't afford the call", async () => {
    const pool: PooledKey[] = [{ key: "a", remaining: 2 }, { key: "b", remaining: 100 }];
    expect(await withFallback(pool, 4, ok("b did it", 96))).toBe("b did it");
    expect(pool[0].remaining).toBe(2);
  });

  it("returns null when every key is out", async () => {
    const pool: PooledKey[] = [{ key: "a", remaining: 0 }, { key: "b", remaining: 3 }];
    expect(await withFallback(pool, 4, ok("never", 1))).toBeNull();
  });

  it("falls through on a rate limit but rethrows other errors", async () => {
    const limited: PooledKey[] = [{ key: "a", remaining: 100 }, { key: "b", remaining: 100 }];
    expect(
      await withFallback(limited, 4, async (key) => {
        if (key === "a") throw new OddsApiError("slow down", 429);
        return { value: "b", remaining: 90 };
      }),
    ).toBe("b");
    await expect(
      withFallback([{ key: "a", remaining: 100 }], 4, async () => {
        throw new OddsApiError("server error", 500);
      }),
    ).rejects.toThrow("server error");
  });
});
