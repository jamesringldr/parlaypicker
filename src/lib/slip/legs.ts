import { randomUUID } from "node:crypto";
import type { GameCard } from "../games/espn-games";
import { PROP_TABS, type GameProps, type PlayerProp, type PropTab } from "../odds/props";
import type { Sport } from "../odds/types";
import { normName, PROP_STATS, type Leg, type PropStat } from "../live/grade";

// What a tapped line says about itself. The server re-reads the line and price from the feeds, so
// the names here only let the page work out the same keys for highlighting.
export type PickSpec =
  | {
      src: "game";
      // Which ESPN slate the game is on: "nfl", or a college filter.
      slate: string;
      gameId: string;
      kind: "moneyline" | "spread" | "total";
      side: "home" | "away" | "over" | "under";
      away: string;
      home: string;
    }
  | {
      src: "prop";
      eventId: string;
      tab: PropTab;
      player: string;
      point: number | null;
      side: "over" | "under" | "yes";
      away: string;
      home: string;
    };

const gameKey = (away: string, home: string) => `${normName(away)}@${normName(home)}`;

const PROP_STAT: Record<PropTab, PropStat> = {
  tds: "anytime_td",
  passing: "pass_yds",
  rushing: "rush_yds",
  receiving: "rec_yds",
};

// Moneyline, spread and total: one per game per type, so Chiefs -3.5 blocks Bills +3.5 and the other
// total side. Props: one per player per stat, so Over blocks Under and another line of the same stat.
export function conflictKeyOf(spec: PickSpec): string {
  const game = gameKey(spec.away, spec.home);
  return spec.src === "game" ? `${game}|${spec.kind}` : `${game}|${PROP_STAT[spec.tab]}|${normName(spec.player)}`;
}

// The exact line, so a player's own pick can be shown as picked.
export function lineIdOf(spec: PickSpec): string {
  return spec.src === "game"
    ? `${conflictKeyOf(spec)}|${spec.side}`
    : `${conflictKeyOf(spec)}|${spec.side}|${spec.point ?? ""}`;
}

// The same id, read back off a saved leg.
export function lineIdOfLeg(leg: Leg, conflictKey: string): string {
  return leg.kind === "prop"
    ? `${conflictKey}|${leg.prop?.side ?? "yes"}|${leg.prop?.point ?? ""}`
    : `${conflictKey}|${leg.side}`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// A game line as a leg, with the line and price as the scoreboard has them now. Null when the game
// has started or that line isn't posted.
export function legFromGame(
  spec: Extract<PickSpec, { src: "game" }>,
  game: GameCard,
  sport: Sport,
  owner: string,
  now = Date.now(),
): Leg | null {
  const lines = game.lines;
  if (!lines || game.state !== "pre" || new Date(game.kickoff).getTime() <= now) return null;

  const base: Leg = {
    id: randomUUID(),
    owner,
    kind: spec.kind,
    label: "",
    sport,
    matchup: `${game.away.name} @ ${game.home.name}`,
    commenceTime: game.kickoff,
    homeTeam: game.home.name,
    awayTeam: game.away.name,
    side: spec.side,
  };

  if (spec.kind === "moneyline") {
    if (spec.side !== "home" && spec.side !== "away") return null;
    const price = lines.moneyline[spec.side];
    return price === null ? null : { ...base, label: game[spec.side].name, price };
  }
  if (spec.kind === "spread") {
    if (spec.side !== "home" && spec.side !== "away") return null;
    const p = lines.spread[spec.side];
    if (!p || p.line === null) return null;
    return { ...base, label: `${game[spec.side].name} ${signed(p.line)}`, price: p.odds, point: p.line };
  }
  if (spec.side !== "over" && spec.side !== "under") return null;
  const p = lines.total[spec.side];
  if (!p || p.line === null) return null;
  return { ...base, label: `${spec.side === "over" ? "Over" : "Under"} ${p.line}`, price: p.odds, point: p.line };
}

// A player prop as a leg, from the stored FanDuel pull. Null when the game has started or that
// side isn't posted. `team` is which side of the game the player is on, when the rosters say.
export function legFromProp(
  spec: Extract<PickSpec, { src: "prop" }>,
  game: GameProps,
  row: PlayerProp,
  team: "home" | "away" | undefined,
  owner: string,
  now = Date.now(),
): Leg | null {
  if (new Date(game.commenceTime).getTime() <= now) return null;
  const stat = PROP_STAT[spec.tab];
  const { yards } = PROP_TABS[spec.tab];
  const price = spec.side === "over" ? row.over : spec.side === "under" ? row.under : row.yes;
  if (price === null) return null;
  if (yards ? spec.side === "yes" || row.point === null : spec.side !== "yes") return null;

  const side = spec.side === "under" ? "under" : "over";
  return {
    id: randomUUID(),
    owner,
    kind: "prop",
    sport: "nfl",
    eventId: game.eventId,
    matchup: `${game.awayTeam} @ ${game.homeTeam}`,
    commenceTime: game.commenceTime,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    ...(team ? { team: team === "home" ? game.homeTeam : game.awayTeam } : {}),
    price,
    market: PROP_STATS[stat].label,
    label: yards ? `${row.player} ${side === "over" ? "Over" : "Under"} ${row.point}` : row.player,
    prop: yards ? { player: row.player, stat, side, point: row.point! } : { player: row.player, stat },
  };
}

// Whether `taken` (other players' conflict keys, with who holds each) blocks this pick.
export function blockedBy(taken: Map<string, string>, spec: PickSpec): string | null {
  return taken.get(conflictKeyOf(spec)) ?? null;
}
