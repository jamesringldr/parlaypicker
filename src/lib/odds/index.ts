import { fanduelOddsProvider } from "./the-odds-api";
import type { Market, Outcome, OddsProvider } from "./types";

export const oddsProvider: OddsProvider = fanduelOddsProvider;

export const MARKET_LABELS: Record<string, string> = {
  h2h: "Moneyline",
  spreads: "Spread",
  alternate_spreads: "Alt Spread",
  totals: "Total",
  alternate_totals: "Alt Total",
  player_pass_yds: "Passing Yards",
  player_rush_yds: "Rushing Yards",
  player_reception_yds: "Receiving Yards",
  player_anytime_td: "Anytime TD",
};

export function marketLabel(key: string) {
  return MARKET_LABELS[key] ?? key.replace(/^player_/, "").replaceAll("_", " ");
}

export function describeOutcome(market: Market["key"], o: Outcome): string {
  const point =
    o.point === undefined
      ? ""
      : market.includes("spread") && o.point > 0
        ? ` +${o.point}`
        : ` ${o.point}`;
  const who = o.description ? `${o.description} ` : "";
  return `${who}${o.name}${point}`;
}
