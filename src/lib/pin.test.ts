import { beforeAll, describe, expect, it } from "vitest";
import { hashPin, isPin, verifyPin } from "./pin";
import { readSession, signSession, SESSION_MAX_AGE } from "./session";

describe("pin", () => {
  it("accepts the right PIN and rejects a wrong one", () => {
    const stored = hashPin("1234");
    expect(verifyPin("1234", stored)).toBe(true);
    expect(verifyPin("1235", stored)).toBe(false);
  });
  it("salts, so equal PINs hash differently", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1234"));
  });
  it("rejects a malformed stored value", () => {
    expect(verifyPin("1234", "nonsense")).toBe(false);
  });
  it("wants exactly four digits", () => {
    expect(isPin("0042")).toBe(true);
    expect(["123", "12345", "12a4", ""].some(isPin)).toBe(false);
  });
});

describe("session", () => {
  beforeAll(() => {
    process.env.SUPABASE_SECRET_KEY = "test-secret";
  });
  it("round-trips a player", () => {
    expect(readSession(signSession("rodgers"))).toBe("rodgers");
  });
  it("rejects a tampered cookie", () => {
    const [, expires, sig] = signSession("rodgers").split(".");
    expect(readSession(`joe.${expires}.${sig}`)).toBeNull();
    expect(readSession(undefined)).toBeNull();
  });
  it("rejects an expired cookie", () => {
    const cookie = signSession("rodgers", 0);
    expect(readSession(cookie, SESSION_MAX_AGE * 1000 + 1)).toBeNull();
    expect(readSession(cookie, 1000)).toBe("rodgers");
  });
});
