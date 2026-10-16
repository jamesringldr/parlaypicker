"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fail, safeNext } from "@/lib/action-helpers";
import { isPin, verifyPin } from "@/lib/pin";
import { playerBySlug } from "@/lib/players";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

export async function signInWithPin(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  const player = playerBySlug(slug);
  const back = `/login?as=${slug}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  if (!player) fail("/login", "Choose your name.");
  if (!isPin(pin)) fail(back, "Enter your 4-digit PIN.");

  const db = createAdminClient();
  const { data, error } = await db
    .from("player_profiles")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("slug", player.slug)
    .maybeSingle();
  if (error) fail(back, "Something went wrong. Try again.");
  if (!data?.pin_hash) fail(back, `${player.name} doesn't have a PIN yet.`);

  const lockedFor = data.locked_until ? new Date(data.locked_until).getTime() - Date.now() : 0;
  if (lockedFor > 0) fail(back, `Too many wrong tries. Try again in ${Math.ceil(lockedFor / 60000)} min.`);

  if (!verifyPin(pin, data.pin_hash)) {
    const tries = data.failed_attempts + 1;
    const locked = tries >= MAX_TRIES;
    await db
      .from("player_profiles")
      .update({
        failed_attempts: locked ? 0 : tries,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq("slug", player.slug);
    fail(back, locked ? `Too many wrong tries. Locked for ${LOCK_MINUTES} min.` : "That PIN is wrong.");
  }

  if (data.failed_attempts > 0 || data.locked_until) {
    await db.from("player_profiles").update({ failed_attempts: 0, locked_until: null }).eq("slug", player.slug);
  }
  (await cookies()).set(SESSION_COOKIE, signSession(player.slug), sessionCookieOptions);
  redirect(next ?? `/${player.slug}`);
}

export async function signOutPlayer() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
