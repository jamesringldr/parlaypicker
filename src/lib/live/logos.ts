import type { Leg } from "./grade";
import { NFL_CODES } from "./teams";

// College teams are entered by hand, so only add the ones that show up.
const NCAA: Record<string, number> = {
  Pittsburgh: 221,
};

function logoUrl(sport: Leg["sport"], team: string | undefined): string | null {
  if (!team) return null;
  if (sport === "ncaaf") {
    const id = NCAA[team];
    return id ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png` : null;
  }
  const code = NFL_CODES[team];
  return code ? `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png` : null;
}

// The picked team's logo. Totals have no side, so they show both teams.
export function legLogos(leg: Leg): string[] {
  const teams =
    leg.kind === "total"
      ? [leg.awayTeam, leg.homeTeam]
      : [leg.team ?? (leg.side === "home" ? leg.homeTeam : leg.side === "away" ? leg.awayTeam : undefined)];
  return teams.flatMap((t) => logoUrl(leg.sport, t) ?? []);
}
