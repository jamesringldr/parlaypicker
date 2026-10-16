// Spreads Odds API calls over several keys, so one key running dry or failing doesn't stop a pull.

export class OddsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface PooledKey {
  key: string;
  // Credits left, from the last response. Null until the key has answered.
  remaining: number | null;
}

// 401 is what the API sends when a key is out of credits (or bad), and 429 when it's rate limited.
const KEY_PROBLEM = [401, 429];

// Keys with the most credits first, so use drains evenly. Keys that haven't answered go last.
export function orderPool(pool: PooledKey[]): PooledKey[] {
  return [...pool].sort((a, b) => (b.remaining ?? -1) - (a.remaining ?? -1));
}

// Runs `call` on the first key that can afford `need` credits. A key that's out or rejected is
// marked empty and the next one is tried. Returns null when no key works. Any other error is thrown.
export async function withFallback<T>(
  pool: PooledKey[],
  need: number,
  call: (key: string) => Promise<{ value: T; remaining: number | null }>,
): Promise<T | null> {
  for (const entry of pool) {
    if (entry.remaining !== null && entry.remaining < need) continue;
    try {
      const { value, remaining } = await call(entry.key);
      entry.remaining = remaining ?? entry.remaining;
      return value;
    } catch (error) {
      if (error instanceof OddsApiError && KEY_PROBLEM.includes(error.status)) {
        entry.remaining = 0;
        continue;
      }
      throw error;
    }
  }
  return null;
}
