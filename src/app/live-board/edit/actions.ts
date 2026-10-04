"use server";

import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { fail } from "@/lib/action-helpers";
import { getLegs, isAdminKey, LIVE_PATH, saveLegs } from "@/lib/live/board";
import type { Leg, LegKind, Manual } from "@/lib/live/grade";
import { oddsProvider } from "@/lib/odds";

const KINDS: LegKind[] = ["moneyline", "spread", "total", "prop"];
const SIDES = ["home", "away", "over", "under"] as const;

// Every action re-checks the key; the form fields can't be trusted.
function authorize(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!isAdminKey(key)) notFound();
  return `${LIVE_PATH}/edit?key=${encodeURIComponent(key)}`;
}

function num(formData: FormData, name: string): number | undefined {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export async function addLeg(formData: FormData) {
  const back = authorize(formData);
  const owner = String(formData.get("owner") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as LegKind;
  const eventId = String(formData.get("eventId") ?? "");
  const side = String(formData.get("side") ?? "") as (typeof SIDES)[number];
  const point = num(formData, "point");
  const price = num(formData, "price");
  const propLabel = String(formData.get("label") ?? "").trim();

  if (!owner) fail(back, "Enter the owner's name.");
  if (!KINDS.includes(kind)) fail(back, "Choose a leg type.");

  const leg: Leg = { id: randomUUID(), owner, kind, label: propLabel, sport: "nfl", price };

  if (eventId) {
    const event = (await oddsProvider.listEvents("nfl")).find((e) => e.id === eventId);
    if (!event) fail(back, "That game isn't on the schedule anymore. Reload and try again.");
    leg.eventId = event.id;
    leg.matchup = `${event.awayTeam} @ ${event.homeTeam}`;
    leg.commenceTime = event.commenceTime;
    leg.homeTeam = event.homeTeam;
    leg.awayTeam = event.awayTeam;
  }

  if (kind === "prop") {
    if (!propLabel) fail(back, "Describe the prop, e.g. Mahomes over 275.5 pass yds.");
  } else {
    if (!leg.eventId) fail(back, "Choose the game.");
    if (!SIDES.includes(side)) fail(back, "Choose a side.");
    const isTotal = kind === "total";
    if (isTotal !== (side === "over" || side === "under")) {
      fail(back, isTotal ? "A total is Over or Under." : "Choose the home or away team.");
    }
    if (kind !== "moneyline" && point === undefined) fail(back, "Enter the line.");
    leg.side = side;
    if (kind !== "moneyline") leg.point = point;

    const team = side === "home" ? leg.homeTeam : leg.awayTeam;
    leg.label =
      kind === "moneyline"
        ? `${team} ML`
        : kind === "spread"
          ? `${team} ${signed(point!)}`
          : `${side === "over" ? "Over" : "Under"} ${point}`;
  }

  await saveLegs([...(await getLegs()), leg]);
  redirect(back);
}

export async function removeLeg(formData: FormData) {
  const back = authorize(formData);
  const id = String(formData.get("id") ?? "");
  await saveLegs((await getLegs()).filter((l) => l.id !== id));
  redirect(back);
}

// result = "hit" | "miss" | "push", or anything else to clear the hand mark.
export async function markLeg(formData: FormData) {
  const back = authorize(formData);
  const id = String(formData.get("id") ?? "");
  const result = String(formData.get("result") ?? "");
  const manual: Manual | undefined = result === "hit" || result === "miss" || result === "push" ? result : undefined;
  await saveLegs((await getLegs()).map((l) => (l.id === id ? { ...l, manual } : l)));
  redirect(back);
}
