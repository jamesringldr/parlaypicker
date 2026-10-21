import { revalidatePath } from "next/cache";
import { cronAuthorized } from "@/lib/cron-auth";
import { archiveBoard, LIVE_PATH } from "@/lib/live/board";
import { isPullTime, isTuesday } from "@/lib/odds/props";
import { pullNflProps } from "@/lib/odds/props-job";
import { refreshSnapshotPhotos } from "@/lib/odds/props-store";

// Vercel calls this on a schedule (vercel.json), sending the CRON_SECRET. `?force=1` runs it any time,
// for a first pull or a retry.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;

  // `?photos=1` re-matches player photos on the stored props. It costs no credits.
  if (params.get("photos") === "1") {
    try {
      return Response.json((await refreshSnapshotPhotos()) ?? { error: "No props have been pulled yet." });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Photo refresh failed." }, { status: 500 });
    }
  }

  const force = params.get("force") === "1";
  if (!force && !isPullTime(Date.now())) return Response.json({ skipped: "Not noon Central on a Tue, Wed or Thu." });

  // Tuesday's pull also archives last week's board, which opens the new week's picks. A board with a leg
  // still unsettled (or an empty one) is left alone, and the pull goes ahead either way.
  let archive: string | undefined;
  if (!force && isTuesday(Date.now())) {
    try {
      const problem = await archiveBoard();
      archive = problem ?? "Archived last week.";
      if (!problem) for (const path of [LIVE_PATH, `${LIVE_PATH}/past-weeks`, "/bet-slip", "/games"]) revalidatePath(path);
    } catch (error) {
      archive = error instanceof Error ? error.message : "Archive failed.";
    }
  }

  // Either key can pay for the pull. The one with more credits goes first.
  const keys = [process.env.ODDS_API_KEY2, process.env.ODDS_API_KEY].filter((k): k is string => !!k);
  if (keys.length === 0) return Response.json({ error: "No Odds API key is set." }, { status: 500 });

  try {
    return Response.json({ ...(await pullNflProps(keys)), archive });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pull failed." }, { status: 500 });
  }
}
