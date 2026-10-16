import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { PLAYERS } from "@/lib/players";
import { getRoster } from "./players";

export type Role = "user" | "bet_admin" | "super_admin";

export async function getRole(slug: string | null): Promise<Role | null> {
  if (!slug) return null;
  const { data } = await createAdminClient().from("player_profiles").select("role").eq("slug", slug).maybeSingle();
  return (data?.role as Role | undefined) ?? null;
}

export interface ActivityRow {
  slug: string;
  name: string;
  photoUrl: string | null;
  firstLoginAt: string | null;
  lastSeenAt: string | null;
  loginCount: number;
}

// Everyone, most recently seen first. Anyone who hasn't been seen is last, in roster order.
// `at` is when it was loaded, for "5 min ago" labels, so the page doesn't read the clock itself.
export async function getActivity(): Promise<{ rows: ActivityRow[]; at: number }> {
  const [{ data, error }, roster] = await Promise.all([
    createAdminClient().from("player_profiles").select("slug, first_login_at, last_seen_at, last_login_at, login_count"),
    getRoster(),
  ]);
  if (error) throw new Error(`Couldn't load activity: ${error.message}`);
  const bySlug = new Map((data ?? []).map((r) => [r.slug as string, r]));

  const rows = PLAYERS.map((p): ActivityRow => {
    const r = bySlug.get(p.slug);
    return {
      slug: p.slug,
      name: p.name,
      photoUrl: roster.find((x) => x.slug === p.slug)?.photoUrl ?? null,
      firstLoginAt: (r?.first_login_at as string | null) ?? null,
      // A sign-in counts as being seen, even if the player hasn't opened a page since.
      lastSeenAt: [r?.last_seen_at, r?.last_login_at].filter((t): t is string => !!t).sort().at(-1) ?? null,
      loginCount: (r?.login_count as number | undefined) ?? 0,
    };
  });
  return { rows: rows.sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "")), at: Date.now() };
}
