import { timingSafeEqual } from "node:crypto";

// Vercel sends the CRON_SECRET as a bearer token on every scheduled call.
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
