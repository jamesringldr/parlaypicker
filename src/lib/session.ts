import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "lowt_session";
// The longest a browser will keep a cookie. The proxy renews it on every visit.
export const SESSION_MAX_AGE = 400 * 24 * 60 * 60;

// Signed with a key derived from the server's secret, so there's nothing extra to configure.
function sign(payload: string): string {
  const key = createHash("sha256").update(`session:${process.env.SUPABASE_SECRET_KEY ?? ""}`).digest();
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function signSession(slug: string, now = Date.now()): string {
  const payload = `${slug}.${now + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

// The player's slug, or null if the cookie is missing, forged or expired.
export function readSession(value: string | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const [slug, expires, signature] = value.split(".");
  if (!slug || !expires || !signature) return null;
  const expected = Buffer.from(sign(`${slug}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return Number(expires) > now ? slug : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
