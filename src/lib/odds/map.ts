import type { EventOdds, GameEvent, Market, Outcome, Sport } from "./types";

// The Odds API v4 shapes we actually read. Extra fields are ignored.
export interface OddsApiEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

export interface OddsApiEventOdds extends OddsApiEvent {
  bookmakers?: {
    key: string;
    title: string;
    markets?: {
      key: string;
      outcomes?: {
        name?: string;
        description?: string;
        price?: number;
        point?: number;
      }[];
    }[];
  }[];
}

export const FANDUEL = "fanduel";

// Board order. Anything else FanDuel returns is appended after these.
const MARKET_ORDER = [
  "h2h",
  "spreads",
  "alternate_spreads",
  "totals",
  "alternate_totals",
  "player_pass_yds",
  "player_rush_yds",
  "player_reception_yds",
  "player_anytime_td",
];

export function isOddsApiEvent(value: unknown): value is OddsApiEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.commence_time === "string" &&
    typeof event.home_team === "string" &&
    typeof event.away_team === "string"
  );
}

export function toGameEvent(sport: Sport, event: OddsApiEvent): GameEvent {
  return {
    id: event.id,
    sport,
    commenceTime: event.commence_time,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
  };
}

export function toEventOdds(sport: Sport, event: OddsApiEventOdds): EventOdds {
  const book = event.bookmakers?.find((b) => b.key === FANDUEL);
  const markets: Market[] = [];

  for (const market of book?.markets ?? []) {
    const outcomes: Outcome[] = [];
    for (const outcome of market.outcomes ?? []) {
      if (typeof outcome.name !== "string" || typeof outcome.price !== "number") continue;
      outcomes.push({
        name: outcome.name,
        price: outcome.price,
        ...(outcome.description ? { description: outcome.description } : {}),
        ...(typeof outcome.point === "number" ? { point: outcome.point } : {}),
      });
    }
    if (outcomes.length > 0) markets.push({ key: market.key, outcomes });
  }

  markets.sort((a, b) => marketRank(a.key) - marketRank(b.key));

  return {
    ...toGameEvent(sport, event),
    bookmaker: book?.title ?? "FanDuel",
    markets,
  };
}

function marketRank(key: string) {
  const index = MARKET_ORDER.indexOf(key);
  return index === -1 ? MARKET_ORDER.length : index;
}
