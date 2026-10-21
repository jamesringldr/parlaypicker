"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail } from "@/lib/action-helpers";
import { LIVE_PATH } from "@/lib/live/board";
import { canFinalize, currentWeek, finalizeSlip, getSessionViewer } from "@/lib/slip/store";

// Locks the week's picks and puts them on the live board. Bet admins and the super admin only.
export async function finalizeBetSlip() {
  const viewer = await getSessionViewer();
  if (!viewer || !canFinalize(viewer.role)) fail("/bet-slip", "Only an admin can finalize the slip.");

  const problem = await finalizeSlip(await currentWeek(), viewer.slug);
  if (problem) fail("/bet-slip", problem);

  revalidatePath("/bet-slip");
  revalidatePath("/games");
  revalidatePath(LIVE_PATH);
  redirect(LIVE_PATH);
}
