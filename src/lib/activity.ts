import { createClient } from "@supabase/supabase-js";

// A short-lived cookie marks "already recorded this hour", so a page view doesn't write every time.
export const SEEN_COOKIE = "lowt_seen";
export const SEEN_EVERY_SECONDS = 60 * 60;

// Records that a signed-in player just opened the site. It never throws: tracking must not break a page.
// Not "server-only" because the proxy calls it.
export async function touchLastSeen(slug: string, now = new Date()) {
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
    await db.from("player_profiles").update({ last_seen_at: now.toISOString() }).eq("slug", slug);
  } catch {
    // Ignore.
  }
}

// "just now", "5 min ago", "3 h ago", "2 days ago". "Never" when there's no time.
export function timeAgo(from: string | null, now: number): string {
  if (!from) return "Never";
  const minutes = Math.floor((now - new Date(from).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
