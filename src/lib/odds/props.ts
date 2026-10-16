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
  // Photo URL by player name (a team logo for a defense). Missing for anyone ESPN doesn't know.
  photos: Record<string, string>;
  // Which side of their game a player is on, by name. Missing when ESPN's roster doesn't place them.
  sides: Record<string, "away" | "home">;
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

// Lowercase, no accents, no punctuation inside a name ("D'Andre" -> "dandre"), hyphens as spaces.
export const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'\u2019]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const SUFFIXES = ["jr", "sr", "ii", "iii", "iv", "v"];

// Names that match what's been typed. Each typed word has to start a word in the name, so "bij",
// "robinson" and "bijan rob" all find Bijan Robinson. First-name matches come first, then last-name.
export function searchPlayers(names: string[], query: string, limit = 8): string[] {
  const words = normalizeName(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const ranked = names.flatMap((name) => {
    const parts = normalizeName(name).split(" ");
    if (!words.every((w) => parts.some((p) => p.startsWith(w)))) return [];
    const last = [...parts].reverse().find((p) => !SUFFIXES.includes(p)) ?? parts[parts.length - 1];
    const rank = parts[0].startsWith(words[0]) ? 0 : last.startsWith(words[0]) ? 1 : 2;
    return [{ name, rank }];
  });
  return ranked.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)).slice(0, limit).map((r) => r.name);
}

export interface PlayerEntry {
  name: string;
  game: GameProps;
  props: Partial<Record<PropTab, PlayerProp>>;
}

// One entry per player, with whatever props they have across the four markets.
export function playerIndex(games: GameProps[]): PlayerEntry[] {
  const byName = new Map<string, PlayerEntry>();
  for (const game of games) {
    for (const [tab, { market }] of Object.entries(PROP_TABS) as [PropTab, (typeof PROP_TABS)[PropTab]][]) {
      for (const prop of game.markets[market] ?? []) {
        const key = normalizeName(prop.player);
        const entry = byName.get(key) ?? { name: prop.player, game, props: {} };
        entry.props[tab] ??= prop;
        byName.set(key, entry);
      }
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// The first `n` for a prop type: yardage by biggest line, anytime TD by shortest price (likeliest scorer).
export function topProps(games: GameProps[], tab: PropTab, n = 10): { game: GameProps; prop: PlayerProp }[] {
  const { market, yards } = PROP_TABS[tab];
  const all = games.flatMap((game) => (game.markets[market] ?? []).map((prop) => ({ game, prop })));
  all.sort(
    yards
      ? (a, b) => (b.prop.point ?? 0) - (a.prop.point ?? 0) || (a.prop.over ?? 0) - (b.prop.over ?? 0)
      : (a, b) => (a.prop.yes ?? 0) - (b.prop.yes ?? 0),
  );
  return all.slice(0, n);
}

// The odds-provider game for an ESPN card, matched by team names.
export function findGameProps(games: GameProps[], awayTeam: string, homeTeam: string): GameProps | undefined {
  return games.find((g) => g.awayTeam === awayTeam && g.homeTeam === homeTeam);
}

// "Bijan Robinson" -> "B. Robinson", "Marvin Harrison Jr." -> "M. Harrison Jr.". Names that start with
// initials already ("C.J. Stroud") stay as they are, and a team defense is just "Defense".
export function shortName(name: string): string {
  if (name.endsWith(" Defense")) return "Defense";
  const [first, ...rest] = name.trim().split(/\s+/);
  if (rest.length === 0 || first.includes(".")) return name;
  return `${first[0].toUpperCase()}. ${rest.join(" ")}`;
}
