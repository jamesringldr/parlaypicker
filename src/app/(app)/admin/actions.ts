"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail } from "@/lib/action-helpers";
import { requireAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";

async function assertMember(id: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("is_member")
    .eq("id", id)
    .maybeSingle();
  if (!data?.is_member) fail("/admin", "The Better must be an approved member.");
}

function done() {
  revalidatePath("/", "layout");
}

export async function setMembership(formData: FormData) {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ is_member: formData.get("isMember") === "true" })
    .eq("id", String(formData.get("profileId")));
  if (error) fail("/admin", dbErrorMessage(error));
  done();
}

export async function createParlay(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const betterId = String(formData.get("betterId") ?? "");
  if (!title) fail("/admin", "Give the parlay a name.");
  await assertMember(betterId);

  const { error } = await createAdminClient().from("parlays").insert({ title, better_id: betterId });
  if (error) fail("/admin", dbErrorMessage(error));
  done();
}

export async function setBetter(formData: FormData) {
  await requireAdmin();
  const betterId = String(formData.get("betterId") ?? "");
  await assertMember(betterId);

  const { error } = await createAdminClient()
    .from("parlays")
    .update({ better_id: betterId })
    .eq("id", String(formData.get("parlayId")));
  if (error) fail("/admin", dbErrorMessage(error));
  done();
}

export async function setParlayStatus(formData: FormData) {
  await requireAdmin();
  const status = formData.get("status") === "locked" ? "locked" : "open";

  const { error } = await createAdminClient()
    .from("parlays")
    .update({ status })
    .eq("id", String(formData.get("parlayId")));
  if (error) fail("/admin", dbErrorMessage(error));
  done();
}
