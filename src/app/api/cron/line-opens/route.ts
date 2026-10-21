import { cronAuthorized } from "@/lib/cron-auth";
import { isOpenPullTime } from "@/lib/games/opens";
import { pullLineOpens } from "@/lib/games/opens-store";

// Vercel calls this on a schedule (vercel.json), sending the CRON_SECRET: `?league=ncaa` Sunday at 3am Central and
// `?league=nfl` Monday at 3am. It saves each game's line as its "open", once per game. `&force=1` runs it any time.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const league = params.get("league");
  if (league !== "nfl" && league !== "ncaa") return Response.json({ error: "league must be nfl or ncaa." }, { status: 400 });
  if (params.get("force") !== "1" && !isOpenPullTime(league, Date.now())) {
    return Response.json({ skipped: `Not ${league === "ncaa" ? "Sunday" : "Monday"} 3am Central.` });
  }

  try {
    return Response.json(await pullLineOpens(league));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pull failed." }, { status: 500 });
  }
}
