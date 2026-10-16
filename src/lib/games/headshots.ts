import { normalizeName, type GameProps } from "../odds/props";

// Matches prop players to ESPN's roster photos. ESPN keys photos by player id and our odds data only
// has names, so this builds a name index from the team rosters.

interface RosterPlayer {
  id: string;
  path: string; // ESPN image path, like /i/headshots/nfl/players/full/4430807.png
  team: string; // display name, to tell two players with one name apart
}

export interface RosterIndex {
  byName: Map<string, RosterPlayer[]>;
  // Team display name -> its logo, for "Team Defense" props.
  logos: Map<string, string>;
}

const rec = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const SUFFIXES = ["jr", "sr", "ii", "iii", "iv", "v"];

// "marvin harrison jr" -> "marvin harrison", so a prop listed without the suffix still finds the player.
const dropSuffix = (name: string) => {
  const words = name.split(" ");
  while (words.length > 1 && SUFFIXES.includes(words[words.length - 1])) words.pop();
  return words.join(" ");
};

// A small copy for avatars. The full photos are about 270 KB each.
export const photoUrl = (path: string) => `https://a.espncdn.com/combiner/i?img=${path}&w=96&h=70&scale=crop&cquality=40`;
const logoUrl = (abbreviation: string) => `https://a.espncdn.com/i/teamlogos/nfl/500-dark/${abbreviation.toLowerCase()}.png`;

export function buildRosterIndex(rosters: unknown[]): RosterIndex {
  const byName = new Map<string, RosterPlayer[]>();
  const logos = new Map<string, string>();

  for (const roster of rosters) {
    const team = rec(rec(roster).team);
    const teamName = typeof team.displayName === "string" ? team.displayName : "";
    if (teamName && typeof team.abbreviation === "string") logos.set(teamName, logoUrl(team.abbreviation));

    for (const group of arr(rec(roster).athletes)) {
      for (const item of arr(rec(group).items)) {
        const a = rec(item);
        const href = rec(a.headshot).href;
        if (typeof a.fullName !== "string" || typeof a.id !== "string" || typeof href !== "string") continue;
        let path: string;
        try {
          path = new URL(href).pathname;
        } catch {
          continue;
        }
        const entry = { id: a.id, path, team: teamName };
        // Indexed under the full name and the name without Jr./III, so either spelling finds them.
        for (const key of new Set([normalizeName(a.fullName), dropSuffix(normalizeName(a.fullName))])) {
          byName.set(key, [...(byName.get(key) ?? []), entry]);
        }
      }
    }
  }
  return { byName, logos };
}

export interface PlayerMatches {
  // A photo URL for each player name (a team logo for a defense). Anyone not found is left out.
  photos: Record<string, string>;
  // The side of their game each player is on, from the roster they were found on.
  sides: Record<string, "away" | "home">;
}

export function matchPlayers(index: RosterIndex, games: GameProps[]): PlayerMatches {
  const photos: Record<string, string> = {};
  const sides: Record<string, "away" | "home"> = {};
  for (const game of games) {
    const sideOf = (team: string) => (team === game.awayTeam ? "away" : team === game.homeTeam ? "home" : undefined);
    for (const rows of Object.values(game.markets)) {
      for (const { player } of rows) {
        if (photos[player]) continue;

        if (player.endsWith(" Defense")) {
          const team = player.slice(0, -" Defense".length);
          const logo = index.logos.get(team);
          if (logo) photos[player] = logo;
          const side = sideOf(team);
          if (side) sides[player] = side;
          continue;
        }

        const key = normalizeName(player);
        const matches = index.byName.get(key) ?? index.byName.get(dropSuffix(key)) ?? [];
        // Two players can share a name. The one on a team in this game is the one meant.
        const pick = matches.find((m) => sideOf(m.team)) ?? (matches.length === 1 ? matches[0] : undefined);
        if (!pick) continue;
        photos[player] = photoUrl(pick.path);
        const side = sideOf(pick.team);
        if (side) sides[player] = side;
      }
    }
  }
  return { photos, sides };
}
