import type { GameScore, Leg } from "./grade";

// ESPN's team codes (lowercase), which also key their logo CDN. Checked against ESPN's own
// team list: all 32 match, and uppercase is the abbreviation they show ("NE", "WSH").
export const NFL_CODES: Record<string, string> = {
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

// "Washington Commanders" -> "Commanders", "San Francisco 49ers" -> "49ers".
export const nickname = (team: string) => team.split(" ").at(-1)!;

const abbreviation = (team: string) => NFL_CODES[team]?.toUpperCase() ?? nickname(team);

// The game under a leg's title. Before kickoff: "Patriots @ Bills". Once there's a score:
// "NE 7 - 7 BUF" (away first, like the @ line).
export function matchupLine(leg: Leg, score: GameScore | undefined): string {
  const { homeTeam, awayTeam } = leg;
  if (leg.sport !== "nfl" || !homeTeam || !awayTeam) return leg.matchup ?? "";
  if (score && score.homeScore !== null && score.awayScore !== null) {
    return `${abbreviation(awayTeam)} ${score.awayScore} - ${score.homeScore} ${abbreviation(homeTeam)}`;
  }
  return `${nickname(awayTeam)} @ ${nickname(homeTeam)}`;
}
