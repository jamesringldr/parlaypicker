// Shapes mirror The Odds API (v4) so a real provider can drop in without
// touching the rest of the app.

export const SPORTS = {
  nfl: { key: "americanfootball_nfl", label: "NFL" },
  ncaaf: { key: "americanfootball_ncaaf", label: "College" },
} as const;

export type Sport = keyof typeof SPORTS;

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && value in SPORTS;
}

// e.g. "h2h", "spreads", "totals", "alternate_spreads", "player_pass_yds"
export type MarketKey = string;

export interface Outcome {
  // Team name for h2h/spreads, "Over"/"Under" for totals and props, "Yes" for anytime TD.
  name: string;
  // Player name for props.
  description?: string;
  price: number; // American odds
  point?: number;
}

export interface Market {
  key: MarketKey;
  outcomes: Outcome[];
}

export interface GameEvent {
  id: string;
  sport: Sport;
  commenceTime: string; // ISO
  homeTeam: string;
  awayTeam: string;
}

export interface EventOdds extends GameEvent {
  bookmaker: string;
  markets: Market[];
}

export interface OddsProvider {
  listEvents(sport: Sport): Promise<GameEvent[]>;
  getEventOdds(sport: Sport, eventId: string): Promise<EventOdds | null>;
}

// What a Picker submits. Price is deliberately absent: the server looks it up.
export interface Selection {
  sport: Sport;
  eventId: string;
  market: MarketKey;
  name: string;
  description?: string;
  point?: number;
}
