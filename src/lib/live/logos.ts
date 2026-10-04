import type { Leg } from "./grade";

// ESPN's public logo CDN, keyed by their team codes.
const NFL: Record<string, string> = {
  "Arizona Cardinals": "ari",
  "Atlanta Falcons": "atl",
  "Baltimore Ravens": "bal",
  "Buffalo Bills": "buf",
  "Carolina Panthers": "car",
  "Chicago Bears": "chi",
  "Cincinnati Bengals": "cin",
  "Cleveland Browns": "cle",
  "Dallas Cowboys": "dal",
  "Denver Broncos": "den",
  "Detroit Lions": "det",
  "Green Bay Packers": "gb",
  "Houston Texans": "hou",
  "Indianapolis Colts": "ind",
  "Jacksonville Jaguars": "jax",
  "Kansas City Chiefs": "kc",
  "Las Vegas Raiders": "lv",
  "Los Angeles Chargers": "lac",
  "Los Angeles Rams": "lar",
  "Miami Dolphins": "mia",
  "Minnesota Vikings": "min",
  "New England Patriots": "ne",
  "New Orleans Saints": "no",
  "New York Giants": "nyg",
  "New York Jets": "nyj",
  "Philadelphia Eagles": "phi",
  "Pittsburgh Steelers": "pit",
  "San Francisco 49ers": "sf",
  "Seattle Seahawks": "sea",
  "Tampa Bay Buccaneers": "tb",
  "Tennessee Titans": "ten",
  "Washington Commanders": "wsh",
};

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
  const code = NFL[team];
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
