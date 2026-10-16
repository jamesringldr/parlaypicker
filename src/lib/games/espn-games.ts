// Turns ESPN's scoreboard JSON into the cards on the Games tab. ESPN is unofficial, so every field is read defensively.

export interface Price {
  // Spread and total lines, signed like the book shows them.
  line: number | null;
  odds: number;
}

export interface Side {
  abbr: string;
  name: string;
  record: string | null;
  // AP ranking when in the top 25. College only.
  rank: number | null;
  logo: string;
  score: number | null;
}

export interface Lines {
  spread: { away: Price | null; home: Price | null };
  total: { over: Price | null; under: Price | null };
  moneyline: { away: number | null; home: number | null };
  // Where the lines opened. The favorite at open carries the spread.
  open: { total: number | null; favorite: "away" | "home" | null; spread: number | null };
}

export interface Venue {
  city: string | null;
  // A dome or closed roof. The forecast is for outside, so it doesn't matter there.
  indoor: boolean;
}

export interface Forecast {
  // ESPN's condition id, which is AccuWeather's icon number (1 sunny, 18 rain, 32 windy...).
  code: number;
  label: string; // "Mostly cloudy"
  temperature: number | null;
}

export interface GameCard {
  id: string;
  kickoff: string; // ISO
  state: "pre" | "in" | "post";
  // "Q3 · 7:58", "Halftime" or "Final". Empty before kickoff.
  detail: string;
  away: Side;
  home: Side;
  lines: Lines | null;
  venue: Venue;
  forecast: Forecast | null;
}

const rec = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// "+2.5", "-115", "o42.5", "u41.5" -> number. Anything else -> null.
function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const n = Number(value.trim().replace(/^[ou]/i, ""));
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

function price(node: unknown, withLine: boolean): Price | null {
  const close = rec(rec(node).close);
  const odds = parseNumber(close.odds);
  if (odds === null) return null;
  return { line: withLine ? parseNumber(close.line) : null, odds };
}

function parseLines(odds: unknown): Lines | null {
  const o = rec(odds);
  if (Object.keys(o).length === 0) return null;
  const spread = rec(o.pointSpread);
  const total = rec(o.total);
  const ml = rec(o.moneyline);

  const openHome = parseNumber(rec(rec(spread.home).open).line);
  const favorite = openHome === null || openHome === 0 ? null : openHome < 0 ? "home" : "away";

  const lines: Lines = {
    spread: { away: price(spread.away, true), home: price(spread.home, true) },
    total: { over: price(total.over, true), under: price(total.under, true) },
    moneyline: { away: price(ml.away, false)?.odds ?? null, home: price(ml.home, false)?.odds ?? null },
    open: {
      total: parseNumber(rec(rec(total.over).open).line),
      favorite,
      spread: openHome === null ? null : -Math.abs(openHome),
    },
  };
  const empty = !lines.spread.away && !lines.spread.home && !lines.total.over && !lines.total.under;
  return empty && lines.moneyline.away === null && lines.moneyline.home === null ? null : lines;
}

function parseSide(c: Record<string, unknown>): Side {
  const team = rec(c.team);
  const overall = arr(c.records).map(rec).find((r) => r.type === "total");
  const score = parseNumber(c.score);
  const rank = parseNumber(rec(c.curatedRank).current);
  return {
    abbr: String(team.abbreviation ?? ""),
    name: String(team.displayName ?? ""),
    record: typeof overall?.summary === "string" ? overall.summary : null,
    rank: rank !== null && rank >= 1 && rank <= 25 ? rank : null,
    logo: String(team.logoDark ?? team.logo ?? ""),
    score,
  };
}

function parseForecast(weather: unknown): Forecast | null {
  const w = rec(weather);
  const code = parseNumber(w.conditionId);
  if (code === null || typeof w.displayValue !== "string") return null;
  return { code, label: w.displayValue, temperature: parseNumber(w.temperature) };
}

export function parseGames(json: unknown): GameCard[] {
  return arr(rec(json).events).flatMap((event): GameCard[] => {
    const e = rec(event);
    const comp = rec(arr(e.competitions)[0]);
    const competitors = arr(comp.competitors).map(rec);
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    if (!home || !away || typeof e.id !== "string" || typeof e.date !== "string") return [];

    const type = rec(rec(e.status).type);
    const state = type.state === "in" ? "in" : type.state === "post" ? "post" : "pre";
    const detail =
      state === "post"
        ? String(type.shortDetail ?? "Final")
        : state === "in"
          ? String(type.shortDetail ?? "Live")
          : "";
    return [
      {
        id: e.id,
        kickoff: e.date,
        state,
        detail,
        away: parseSide(away),
        home: parseSide(home),
        lines: parseLines(arr(comp.odds)[0]),
        venue: {
          city: typeof rec(rec(comp.venue).address).city === "string" ? String(rec(rec(comp.venue).address).city) : null,
          indoor: rec(comp.venue).indoor === true,
        },
        // ESPN puts the forecast on the event, not the competition.
        forecast: parseForecast(e.weather),
      },
    ];
  });
}
