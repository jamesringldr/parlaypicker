import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// "salt:hash", both hex. A 4-digit PIN is weak whatever the hash, so the real defence is the lockout.
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pin, Buffer.from(salt, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const isPin = (value: string) => /^\d{4}$/.test(value);
