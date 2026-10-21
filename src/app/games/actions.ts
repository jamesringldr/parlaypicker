"use server";

import { revalidatePath } from "next/cache";
import { getCollegeSlate, getNflSlate, isCollegeFilter } from "@/lib/games/scoreboard";
import { isPropTab, PROP_TABS } from "@/lib/odds/props";
import { getUpcomingProps } from "@/lib/odds/props-store";
import { conflictKeyOf, legFromGame, legFromProp, type PickSpec } from "@/lib/slip/legs";
import { clearPick, currentWeek, getSessionViewer, savePick } from "@/lib/slip/store";

export interface PickResult {
  error?: string;
}

const GAME_SIDES = ["home", "away", "over", "under"];
const PROP_SIDES = ["over", "under", "yes"];

// Reads the form back into a spec. The names are only used to build the conflict key if the game
// can't be found, so they're never trusted for the line or price.
function readSpec(formData: FormData): PickSpec | null {
  const text = (name: string) => String(formData.get(name) ?? "");
  const away = text("away");
  const home = text("home");
  const side = text("side");
  if (text("src") === "game") {
    const kind = text("kind");
    if (!["moneyline", "spread", "total"].includes(kind) || !GAME_SIDES.includes(side)) return null;
    return {
      src: "game",
      slate: text("slate"),
      gameId: text("gameId"),
      kind: kind as "moneyline" | "spread" | "total",
      side: side as "home" | "away" | "over" | "under",
      point: null,
      away,
      home,
    };
  }
  if (text("src") === "prop") {
    const tab = text("tab");
    if (!isPropTab(tab) || !PROP_SIDES.includes(side)) return null;
    const point = text("point");
    return {
      src: "prop",
      eventId: text("eventId"),
      tab,
      player: text("player"),
      point: point === "" ? null : Number(point),
      side: side as "over" | "under" | "yes",
      away,
      home,
    };
  }
  return null;
}

// Tapping a line makes it the player's pick for the week, replacing any earlier one. Tapping the
// line that's already theirs (intent "remove") takes it back.
export async function makePick(_previous: PickResult, formData: FormData): Promise<PickResult> {
  const viewer = await getSessionViewer();
  if (!viewer) return { error: "Sign in to make a pick." };
  const week = await currentWeek();

  if (formData.get("intent") === "remove") {
    const problem = await clearPick(week, viewer.slug);
    if (problem) return { error: problem };
    revalidatePath("/", "layout");
    return {};
  }

  const spec = readSpec(formData);
  if (!spec) return { error: "That line isn't available." };

  // The line and price come from the feeds, never from the form.
  let leg;
  let conflictKey;
  try {
    if (spec.src === "game") {
      const slate = spec.slate === "nfl" ? await getNflSlate() : isCollegeFilter(spec.slate) ? await getCollegeSlate(spec.slate) : null;
      const game = slate?.games.find((g) => g.id === spec.gameId);
      if (!game) return { error: "That game isn't on the board anymore." };
      leg = legFromGame(spec, game, spec.slate === "nfl" ? "nfl" : "ncaaf", viewer.name);
      conflictKey = conflictKeyOf({ ...spec, away: game.away.name, home: game.home.name });
    } else {
      const props = await getUpcomingProps();
      const game = props?.games.find((g) => g.eventId === spec.eventId);
      const rows = game?.markets[PROP_TABS[spec.tab].market];
      const row = rows?.find((r) => r.player === spec.player && r.point === spec.point);
      if (!props || !game || !row) return { error: "That line isn't available anymore." };
      leg = legFromProp(spec, game, row, props.sides[row.player], viewer.name);
      conflictKey = conflictKeyOf({ ...spec, away: game.awayTeam, home: game.homeTeam });
    }
  } catch {
    return { error: "Couldn't load the lines. Try again." };
  }
  if (!leg || !conflictKey) return { error: "That line is closed or no longer posted." };

  const problem = await savePick(week, viewer.slug, leg, conflictKey);
  if (problem) return { error: problem };
  // The layout carries the missing-pick badge, so it refreshes too.
  revalidatePath("/", "layout");
  return {};
}
