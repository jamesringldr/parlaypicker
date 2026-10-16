import type { EventOdds } from "./types";

export type PropTab = "tds" | "passing" | "rushing" | "receiving";

export const PROP_TABS: Record<PropTab, { label: string; market: string; yards: boolean }> = {
  tds: { label: "TDs", market: "player_anytime_td", yards: false },
  passing: { label: "Passing", market: "player_pass_yds", yards: true },
  rushing: { label: "Rushing", market: "player_rush_yds", yards: true },
  receiving: { label: "Receiving", market: "player_reception_yds", yards: true },
};

export const isPropTab = (value: unknown): value is PropTab => typeof value === "string" && value in PROP_TABS;

export const PROP_MARKETS = Object.values(PROP_TABS).map((t) => t.market);

export interface PlayerProp {
  player: string;
  // Yardage markets: the line, and the over and under prices.
  point: number | null;
  over: number | null;
  under: number | null;
  // Anytime TD: the price to score.
  yes: number | null;
}

export interface GameProps {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  // Keyed by Odds API market name.
  markets: Record<string, PlayerProp[]>;
}

export interface PropsSnapshot {
  fetchedAt: string;
  games: GameProps[];
  creditsRemaining: number | null;
}

// One player per row, with their over and under lined up.
export function toGameProps(event: EventOdds): GameProps {
  const markets: Record<string, PlayerProp[]> = {};
  for (const market of event.markets) {
    if (!PROP_MARKETS.includes(market.key)) continue;
    const byPlayer = new Map<string, PlayerProp>();
    for (const o of market.outcomes) {
      const player = o.description;
      if (!player) continue;
      const key = `${player}|${o.point ?? ""}`;
      const row = byPlayer.get(key) ?? { player, point: o.point ?? null, over: null, under: null, yes: null };
      const side = o.name.toLowerCase();
      if (side === "over") row.over = o.price;
      else if (side === "under") row.under = o.price;
      else if (side === "yes") row.yes = o.price;
      byPlayer.set(key, row);
    }
    // A row with nothing to bet on (a lone "No") isn't worth listing.
    markets[market.key] = [...byPlayer.values()].filter((r) => r.over !== null || r.under !== null || r.yes !== null);
  }
  return { eventId: event.id, homeTeam: event.homeTeam, awayTeam: event.awayTeam, commenceTime: event.commenceTime, markets };
}

// The pull runs at noon Central on Tuesday, Wednesday and Thursday. Vercel's cron runs on UTC, so it
// fires at both 17:00 and 18:00 UTC and this decides which one is actually noon (daylight saving).
export function isPullTime(now: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "America/Chicago",
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return ["Tue", "Wed", "Thu"].includes(get("weekday") ?? "") && get("hour") === "12";
}
