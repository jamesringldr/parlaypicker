"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, safeNext } from "@/lib/action-helpers";
import { isPin, verifyPin } from "@/lib/pin";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

// Every PIN is different, so the PIN alone says who's signing in.
export async function signInWithPin(formData: FormData) {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  const back = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  if (!isPin(pin)) fail(back, "Enter your 4-digit PIN.");

  // Wrong tries are counted per visitor, since there's no name to count them against.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const db = createAdminClient();
  const { data: attempts } = await db
    .from("login_attempts")
    .select("failed_attempts, locked_until")
    .eq("ip", ip)
    .maybeSingle();
  const lockedFor = attempts?.locked_until ? new Date(attempts.locked_until).getTime() - Date.now() : 0;
  if (lockedFor > 0) fail(back, `Too many wrong tries. Try again in ${Math.ceil(lockedFor / 60000)} min.`);

  const { data: players, error } = await db.from("player_profiles").select("slug, pin_hash, login_count, first_login_at").not("pin_hash", "is", null);
  if (error) fail(back, "Something went wrong. Try again.");
  const match = players.find((p) => verifyPin(pin, p.pin_hash as string));

  if (!match) {
    const tries = (attempts?.failed_attempts ?? 0) + 1;
    const locked = tries >= MAX_TRIES;
    await db.from("login_attempts").upsert({
      ip,
      failed_attempts: locked ? 0 : tries,
      locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
    });
    fail(back, locked ? `Too many wrong tries. Locked for ${LOCK_MINUTES} min.` : "That PIN is wrong.");
  }

  if (attempts) await db.from("login_attempts").delete().eq("ip", ip);

  // Note the sign-in for the Activity page. Never let tracking stop someone from getting in.
  const now = new Date().toISOString();
  await db
    .from("player_profiles")
    .update({
      first_login_at: match.first_login_at ?? now,
      last_login_at: now,
      last_seen_at: now,
      login_count: ((match.login_count as number | null) ?? 0) + 1,
    })
    .eq("slug", match.slug)
    .then(undefined, () => undefined);
  (await cookies()).set(SESSION_COOKIE, signSession(match.slug as string), sessionCookieOptions);
  redirect(next ?? `/${match.slug}`);
}

export async function signOutPlayer() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
