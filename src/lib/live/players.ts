import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { PLAYERS, playerBySlug, sameOwner, tally, type Tally } from "@/lib/players";
import { AWARD_EMOJI, badges, ROLE_EMOJI, type Badge } from "@/lib/stats";
import { getBoard, getPastWeeks, type ArchivedLeg } from "./board";
import { gradeLeg, legKey, legScore, type Grade, type Leg } from "./grade";
import { getScores } from "./scores";

export interface PlayerWeek {
  weekNumber: number;
  // Fantasy result that week, when we have it.
  role: "high" | "low" | null;
  legs: ArchivedLeg[];
}

export interface PlayerProfile {
  name: string;
  fantasyName: string | null;
  photoUrl: string | null;
  record: Tally;
  weeks: PlayerWeek[];
  // This week's picks, graded as they stand. Not in the record until the week is archived.
  current: { weekNumber: number; role: "high" | "low" | null; legs: { leg: Leg; grade: Grade }[] };
}

export async function getPlayerProfile(slug: string): Promise<PlayerProfile | null> {
  const player = playerBySlug(slug);
  if (!player) return null;

  const db = createAdminClient();
  const [extras, roles, past, board] = await Promise.all([
    db.from("player_profiles").select("fantasy_name, photo_url").eq("slug", slug).maybeSingle(),
    db.from("player_weeks").select("week_number, role").eq("slug", slug),
    getPastWeeks(),
    getBoard(),
  ]);
  if (extras.error) throw new Error(`Couldn't load the profile: ${extras.error.message}`);
  if (roles.error) throw new Error(`Couldn't load the profile: ${roles.error.message}`);
  const roleOf = new Map(roles.data.map((r) => [r.week_number as number, r.role as "high" | "low"]));

  const weeks = past
    .map((w) => ({
      weekNumber: w.weekNumber,
      role: roleOf.get(w.weekNumber) ?? null,
      legs: w.legs.filter((l) => sameOwner(l.owner, player.name)),
    }))
    .filter((w) => w.legs.length > 0);

  const mine = board.legs.filter((l) => sameOwner(l.owner, player.name));
  const { scores, boxes } = await getScores(mine);
  const legs = mine.map((leg) => ({
    leg,
    grade: gradeLeg(leg, legScore(leg, scores), boxes.get(legKey(leg))),
  }));
  // Archiving numbers the board's week as the one after the last archived week.
  const currentWeek = Math.max(0, ...past.map((w) => w.weekNumber)) + 1;

  return {
    name: player.name,
    fantasyName: extras.data?.fantasy_name ?? null,
    photoUrl: extras.data?.photo_url ?? null,
    record: tally(weeks.flatMap((w) => w.legs.map((l) => l.result))),
    weeks,
    current: { weekNumber: currentWeek, role: roleOf.get(currentWeek) ?? null, legs },
  };
}

// The emojis on a player's avatar: the top-left one for the high or low scorer of the latest week that has them
// recorded, and the bottom-right one for the best or worst pick of the latest week that has those. Both stay until
// the next week's are entered, so they don't clear when the board is archived.
export type Marks = { corner?: string; award?: string };

export const getAvatarMarks = cache(async (): Promise<Map<string, Marks>> => {
  const db = createAdminClient();
  const [roles, awards] = await Promise.all([
    db.from("player_weeks").select("week_number, slug, role"),
    db.from("pick_awards").select("week_number, slug, kind"),
  ]);
  if (roles.error) throw new Error(`Couldn't load the scorers: ${roles.error.message}`);
  if (awards.error) throw new Error(`Couldn't load the pick awards: ${awards.error.message}`);

  const marks = new Map<string, Marks>();
  const put = (slug: string, mark: Marks) => marks.set(slug, { ...marks.get(slug), ...mark });
  const latestRole = Math.max(0, ...roles.data.map((r) => r.week_number as number));
  for (const r of roles.data) {
    if (r.week_number === latestRole && (r.role === "high" || r.role === "low")) put(r.slug as string, { corner: ROLE_EMOJI[r.role as "high" | "low"] });
  }
  const latestAward = Math.max(0, ...awards.data.map((r) => r.week_number as number));
  for (const r of awards.data) {
    if (r.week_number === latestAward && (r.kind === "best" || r.kind === "worst")) put(r.slug as string, { award: AWARD_EMOJI[r.kind as "best" | "worst"] });
  }
  return marks;
});

export const marksOf = (marks: Map<string, Marks>, slug: string): Marks => marks.get(slug) ?? {};

export interface RosterEntry {
  name: string;
  slug: string;
  photoUrl: string | null;
}

// Everyone with their photo, in roster order.
export async function getRoster(): Promise<RosterEntry[]> {
  const { data, error } = await createAdminClient().from("player_profiles").select("slug, photo_url");
  if (error) throw new Error(`Couldn't load the roster: ${error.message}`);
  const photos = new Map(data.map((r) => [r.slug as string, r.photo_url as string | null]));
  return PLAYERS.map((p) => ({ ...p, photoUrl: photos.get(p.slug) ?? null }));
}

// Fire and ice badges for everyone, from the archived weeks.
export async function getBadges(): Promise<Map<string, Badge>> {
  return badges(await getPastWeeks());
}
