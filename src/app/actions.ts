"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorMessage, fail } from "@/lib/action-helpers";
import { getCurrentParlay, getViewer } from "@/lib/data";
import { oddsProvider } from "@/lib/odds";
import { isSport } from "@/lib/odds/types";
import { conflictKey } from "@/lib/rules";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function submitPick(formData: FormData) {
  const viewer = await getViewer();
  const sport = formData.get("sport");
  const eventId = String(formData.get("eventId") ?? "");
  const market = String(formData.get("market") ?? "");
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const point = String(formData.get("point") ?? "");

  if (!isSport(sport)) fail("/pick", "Unknown sport.");
  const back = `/pick/${encodeURIComponent(eventId)}?sport=${sport}`;

  const current = await getCurrentParlay();
  if (!current || current.parlay.status !== "open") fail(back, "There's no open parlay.");
  if (!viewer.is_member) fail(back, "Only group members can pick.");
  if (viewer.id === current.parlay.better_id) fail(back, "The Better cannot make a pick.");

  // Price and line come from the provider, never from the form.
  const event = await oddsProvider.getEventOdds(sport, eventId);
  const outcome = event?.markets
    .find((m) => m.key === market)
    ?.outcomes.find(
      (o) =>
        o.name === name &&
        (o.description ?? "") === description &&
        String(o.point ?? "") === point,
    );
  if (!event || !outcome) fail(back, "That line is no longer available. Refresh and try again.");

  const { error } = await createAdminClient().from("picks").insert({
    parlay_id: current.parlay.id,
    picker_id: viewer.id,
    sport,
    event_id: event.id,
    home_team: event.homeTeam,
    away_team: event.awayTeam,
    commence_time: event.commenceTime,
    market,
    selection: outcome.name,
    player: outcome.description ?? null,
    point: outcome.point ?? null,
    price: outcome.price,
    bookmaker: event.bookmaker,
    conflict_key: conflictKey(event.id, market, outcome),
  });
  if (error) fail(back, dbErrorMessage(error));

  revalidatePath("/");
  redirect("/");
}

export async function removePick(formData: FormData) {
  const viewer = await getViewer();
  const current = await getCurrentParlay();
  if (!current || current.parlay.status !== "open") fail("/", "This parlay is locked.");

  const { error } = await createAdminClient()
    .from("picks")
    .delete()
    .eq("id", String(formData.get("pickId")))
    .eq("parlay_id", current.parlay.id)
    .eq("picker_id", viewer.id);
  if (error) fail("/", dbErrorMessage(error));

  revalidatePath("/");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
