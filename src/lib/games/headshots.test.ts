import { describe, expect, it } from "vitest";
import type { GameProps } from "../odds/props";
import { buildRosterIndex, matchPlayers, photoUrl } from "./headshots";

const athlete = (id: string, fullName: string) => ({
  id,
  fullName,
  headshot: { href: `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png` },
});
const roster = (displayName: string, abbreviation: string, ...players: ReturnType<typeof athlete>[]) => ({
  team: { displayName, abbreviation },
  athletes: [{ position: "offense", items: players }],
});

const index = buildRosterIndex([
  roster("Atlanta Falcons", "ATL", athlete("1", "Bijan Robinson"), athlete("2", "Kyle Pitts Sr.")),
  roster("Buffalo Bills", "BUF", athlete("3", "Josh Allen")),
  roster("Jacksonville Jaguars", "JAX", athlete("4", "Josh Allen"), athlete("5", "Brian Thomas Jr.")),
  roster("Chicago Bears", "CHI", athlete("6", "D'Andre Swift")),
]);

const game = (home: string, away: string, ...players: string[]): GameProps => ({
  eventId: "g",
  homeTeam: home,
  awayTeam: away,
  commenceTime: "2026-10-18T17:00:00Z",
  markets: { player_anytime_td: players.map((player) => ({ player, point: null, over: null, under: null, yes: -110 })) },
});

describe("matchPlayers", () => {
  it("finds a player by name and asks ESPN for a small copy", () => {
    const photos = matchPlayers(index, [game("Atlanta Falcons", "Chicago Bears", "Bijan Robinson")]).photos;
    expect(photos["Bijan Robinson"]).toBe(photoUrl("/i/headshots/nfl/players/full/1.png"));
    expect(photos["Bijan Robinson"]).toContain("w=96");
  });

  it("ignores punctuation and accents in names", () => {
    const photos = matchPlayers(index, [game("Atlanta Falcons", "Chicago Bears", "DAndre Swift", "D'Andre Swift")]).photos;
    expect(Object.keys(photos).sort()).toEqual(["D'Andre Swift", "DAndre Swift"]);
  });

  it("matches with or without a Jr./Sr. suffix", () => {
    const photos = matchPlayers(index, [game("Jacksonville Jaguars", "Atlanta Falcons", "Brian Thomas", "Kyle Pitts")]).photos;
    expect(photos["Brian Thomas"]).toContain("5.png");
    expect(photos["Kyle Pitts"]).toContain("2.png");
  });

  it("uses the game's teams to pick between two players with one name", () => {
    const bills = matchPlayers(index, [game("Buffalo Bills", "Chicago Bears", "Josh Allen")]).photos;
    const jags = matchPlayers(index, [game("Jacksonville Jaguars", "Chicago Bears", "Josh Allen")]).photos;
    expect(bills["Josh Allen"]).toContain("3.png");
    expect(jags["Josh Allen"]).toContain("4.png");
  });

  it("doesn't guess when a duplicate name isn't in the game", () => {
    expect(matchPlayers(index, [game("Chicago Bears", "Atlanta Falcons", "Josh Allen")]).photos["Josh Allen"]).toBeUndefined();
  });

  it("gives a defense its team logo", () => {
    const photos = matchPlayers(index, [game("Atlanta Falcons", "Chicago Bears", "Chicago Bears Defense", "Nowhere Defense")]).photos;
    expect(photos["Chicago Bears Defense"]).toBe("https://a.espncdn.com/i/teamlogos/nfl/500-dark/chi.png");
    expect(photos["Nowhere Defense"]).toBeUndefined();
  });

  it("leaves out players ESPN doesn't know and survives junk rosters", () => {
    expect(matchPlayers(index, [game("Atlanta Falcons", "Chicago Bears", "Nobody Atall")]).photos).toEqual({});
    expect(() => buildRosterIndex([null, "x", { athletes: [{ items: [{ fullName: "A" }] }] }])).not.toThrow();
  });
});

describe("matchPlayers sides", () => {
  it("puts each player on the away or home side of the game", () => {
    const { sides } = matchPlayers(index, [game("Atlanta Falcons", "Chicago Bears", "Bijan Robinson", "D'Andre Swift", "Chicago Bears Defense")]);
    expect(sides["Bijan Robinson"]).toBe("home");
    expect(sides["D'Andre Swift"]).toBe("away");
    expect(sides["Chicago Bears Defense"]).toBe("away");
  });

  it("leaves a player out when their roster team isn't in the game", () => {
    const { photos, sides } = matchPlayers(index, [game("Chicago Bears", "Buffalo Bills", "Bijan Robinson")]);
    expect(photos["Bijan Robinson"]).toBeDefined(); // one match, so the photo is still used
    expect(sides["Bijan Robinson"]).toBeUndefined();
  });
});
