import { timingSafeEqual } from "node:crypto";
import { isPullTime } from "@/lib/odds/props";
import { pullNflProps } from "@/lib/odds/props-job";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Vercel calls this on a schedule (vercel.json), sending the CRON_SECRET. `?force=1` runs it any time,
// for a first pull or a retry.
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isPullTime(Date.now())) return Response.json({ skipped: "Not noon Central on a Tue, Wed or Thu." });

  // Either key can pay for the pull. The one with more credits goes first.
  const keys = [process.env.ODDS_API_KEY2, process.env.ODDS_API_KEY].filter((k): k is string => !!k);
  if (keys.length === 0) return Response.json({ error: "No Odds API key is set." }, { status: 500 });

  try {
    return Response.json(await pullNflProps(keys));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pull failed." }, { status: 500 });
  }
}
