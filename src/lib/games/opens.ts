import type { GameCard } from "./espn-games";

export type League = "nfl" | "ncaa";

// A game's line as first saved, by ESPN game id. The home spread carries the favorite: negative means home was favored.
export interface StoredOpen {
  homeSpread: number | null;
  total: number | null;
  kickoff: string;
}

export type StoredOpens = Record<string, StoredOpen>;

// Saved opens are only needed until the game is played.
const KEEP_MS = 21 * 24 * 60 * 60 * 1000;

// Adds the upcoming games that have no saved open yet, with their line as it is now, and drops old ones. A saved
// open is never replaced, so a later pull can't overwrite where a line first stood.
export function recordOpens(existing: StoredOpens, games: GameCard[], now: number): { opens: StoredOpens; added: number } {
  const opens: StoredOpens = {};
  for (const [id, open] of Object.entries(existing)) {
    if (new Date(open.kickoff).getTime() >= now - KEEP_MS) opens[id] = open;
  }
  let added = 0;
  for (const g of games) {
    if (g.state !== "pre" || !g.lines || g.id in opens) continue;
    const { spread, total } = g.lines;
    const homeSpread = spread.home?.line ?? (spread.away?.line != null ? -spread.away.line : null);
    const line = total.over?.line ?? total.under?.line ?? null;
    if (homeSpread === null && line === null) continue;
    opens[g.id] = { homeSpread, total: line, kickoff: g.kickoff };
    added++;
  }
  return { opens, added };
}

// The same shape ESPN's own "open" has, so the card and the movement math read it unchanged. No saved open means
// nothing to show, never ESPN's number (which can be from long before the week).
export function applyOpens(game: GameCard, opens: StoredOpens | null): GameCard {
  if (!game.lines) return game;
  const saved = opens?.[game.id];
  if (!saved) return { ...game, lines: { ...game.lines, open: { total: null, favorite: null, spread: null } } };
  const { homeSpread, total } = saved;
  return {
    ...game,
    lines: {
      ...game.lines,
      open: {
        total,
        favorite: homeSpread === null || homeSpread === 0 ? null : homeSpread < 0 ? "home" : "away",
        spread: homeSpread === null ? null : -Math.abs(homeSpread),
      },
    },
  };
}

// College opens are saved Sunday at 3am Central and the NFL's Monday at 3am. Vercel's cron runs on UTC, so each
// is scheduled at both 08:00 and 09:00 UTC and this decides which one is actually 3am (daylight saving).
export function isOpenPullTime(league: League, now: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "America/Chicago",
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return get("weekday") === (league === "ncaa" ? "Sun" : "Mon") && Number(get("hour")) === 3;
}
