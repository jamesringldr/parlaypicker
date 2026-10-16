import "server-only";
import { slipRows, type SlipLeg, type SlipRow } from "@/lib/betslip";
import { sameOwner, tally, type Tally } from "@/lib/players";
import { createAdminClient } from "@/lib/supabase/server";
import { getBoard, getPastWeeks } from "./board";
import { gradeLeg } from "./grade";
import { getRoster } from "./players";
import { getScores } from "./scores";

export interface Scorer {
  name: string;
  slug: string;
  photoUrl: string | null;
}

export interface BetSlip {
  weeks: number[];
  current: number;
  selected: number;
  // Closed weeks are archived and settled. The current week is the live board.
  closed: boolean;
  rows: SlipRow[];
  photos: Map<string, string | null>;
  picksIn: number;
  total: number;
  // Closed weeks only.
  record: Tally | null;
  totalPrice: number | null;
  high: Scorer[];
  low: Scorer[];
}

export async function getBetSlip(requested: number | null): Promise<BetSlip> {
  const db = createAdminClient();
  const [past, board, roster, scorers] = await Promise.all([
    getPastWeeks(),
    getBoard(),
    getRoster(),
    db.from("player_weeks").select("week_number, slug, role"),
  ]);
  if (scorers.error) throw new Error(`Couldn't load the week: ${scorers.error.message}`);

  // Archiving numbers the board's week as the one after the last archived week.
  const current = Math.max(0, ...past.map((w) => w.weekNumber)) + 1;
  const weeks = [...past.map((w) => w.weekNumber).sort((a, b) => a - b), current];
  const selected = requested !== null && weeks.includes(requested) ? requested : current;
  const closed = selected !== current;

  let slipLegs: SlipLeg[];
  let record: Tally | null = null;
  let totalPrice: number | null = null;
  if (closed) {
    const week = past.find((w) => w.weekNumber === selected)!;
    slipLegs = week.legs.map((l) => ({
      id: l.id,
      owner: l.owner,
      label: l.label,
      matchup: l.matchup,
      price: l.price,
      status: l.result,
    }));
    record = tally(week.legs.map((l) => l.result));
    totalPrice = week.totalPrice;
  } else {
    // Graded as the games stand. Anything not settled yet is open.
    const { scores, boxes } = await getScores(board.legs);
    slipLegs = board.legs.map((l) => {
      const { state } = gradeLeg(l, l.eventId ? scores.get(l.eventId) : undefined, l.eventId ? boxes.get(l.eventId) : undefined);
      return {
        id: l.id,
        owner: l.owner,
        label: l.label,
        matchup: l.matchup,
        price: l.price,
        status: state === "hit" || state === "miss" || state === "push" ? state : "open",
      };
    });
  }

  const rows = slipRows(slipLegs);
  const photos = new Map(roster.map((p) => [p.slug, p.photoUrl]));
  const scorer = (role: "high" | "low"): Scorer[] =>
    scorers.data
      .filter((r) => r.week_number === selected && r.role === role)
      .flatMap((r) => {
        const p = roster.find((x) => x.slug === r.slug);
        return p ? [{ name: p.name, slug: p.slug, photoUrl: p.photoUrl }] : [];
      });

  return {
    weeks,
    current,
    selected,
    closed,
    rows,
    photos,
    picksIn: roster.filter((p) => slipLegs.some((l) => sameOwner(l.owner, p.name))).length,
    total: roster.length,
    record,
    totalPrice,
    high: scorer("high"),
    low: scorer("low"),
  };
}
