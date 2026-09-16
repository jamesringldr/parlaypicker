import type { EventOdds, GameEvent, Market, OddsProvider, Sport } from "./types";

// Placeholder data until a sportsbook is chosen. Every game kicks off in the
// future relative to now so the pick flow is always usable.

const MATCHUPS: Record<Sport, [away: string, home: string][]> = {
  nfl: [
    ["Buffalo Bills", "Kansas City Chiefs"],
    ["Philadelphia Eagles", "Dallas Cowboys"],
    ["Detroit Lions", "Green Bay Packers"],
    ["San Francisco 49ers", "Los Angeles Rams"],
    ["Baltimore Ravens", "Cincinnati Bengals"],
  ],
  ncaaf: [
    ["Alabama Crimson Tide", "Georgia Bulldogs"],
    ["Ohio State Buckeyes", "Michigan Wolverines"],
    ["Texas Longhorns", "Oklahoma Sooners"],
    ["Oregon Ducks", "USC Trojans"],
  ],
};

// Deterministic pseudo-random so lines don't jump between requests.
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function nickname(team: string) {
  return team.split(" ").at(-1)!;
}

function events(sport: Sport): GameEvent[] {
  const now = Date.now();
  return MATCHUPS[sport].map(([away, home], i) => ({
    id: `mock-${sport}-${i}`,
    sport,
    // Stagger kickoffs 1–5 days out, on the hour.
    commenceTime: new Date(Math.ceil((now + (i + 1) * 86_400_000) / 3_600_000) * 3_600_000).toISOString(),
    homeTeam: home,
    awayTeam: away,
  }));
}

function markets(event: GameEvent): Market[] {
  const rand = seeded(event.id);
  const spread = Math.round(rand() * 12) + 0.5; // home favored by this much
  const total = Math.round(38 + rand() * 20) + 0.5;
  const fav = -(130 + Math.round(rand() * 20) * 10);
  const dog = Math.abs(fav) - 20;
  const juice = () => -(105 + Math.round(rand() * 3) * 5);

  const prop = (key: string, player: string, line: number): Market => ({
    key,
    outcomes: [
      { name: "Over", description: player, price: juice(), point: line },
      { name: "Under", description: player, price: juice(), point: line },
    ],
  });

  const home = nickname(event.homeTeam);
  const away = nickname(event.awayTeam);

  return [
    {
      key: "h2h",
      outcomes: [
        { name: event.homeTeam, price: fav },
        { name: event.awayTeam, price: dog },
      ],
    },
    {
      key: "spreads",
      outcomes: [
        { name: event.homeTeam, price: -110, point: -spread },
        { name: event.awayTeam, price: -110, point: spread },
      ],
    },
    {
      key: "alternate_spreads",
      outcomes: [
        { name: event.homeTeam, price: 150, point: -(spread + 7) },
        { name: event.awayTeam, price: -200, point: spread + 7 },
      ],
    },
    {
      key: "totals",
      outcomes: [
        { name: "Over", price: -110, point: total },
        { name: "Under", price: -110, point: total },
      ],
    },
    prop("player_pass_yds", `${home} QB1`, 225.5 + Math.round(rand() * 6) * 10),
    prop("player_pass_yds", `${away} QB1`, 215.5 + Math.round(rand() * 6) * 10),
    prop("player_rush_yds", `${home} RB1`, 55.5 + Math.round(rand() * 4) * 5),
    prop("player_reception_yds", `${away} WR1`, 60.5 + Math.round(rand() * 4) * 5),
    {
      key: "player_anytime_td",
      outcomes: [
        { name: "Yes", description: `${home} RB1`, price: 110 },
        { name: "Yes", description: `${away} WR1`, price: 160 },
      ],
    },
  ];
}

export const mockOddsProvider: OddsProvider = {
  async listEvents(sport) {
    return events(sport);
  },
  async getEventOdds(sport, eventId) {
    const event = events(sport).find((e) => e.id === eventId);
    if (!event) return null;
    return { ...event, bookmaker: "mock", markets: markets(event) } satisfies EventOdds;
  },
};
