import type { Forecast, Venue } from "./espn-games";

export type ForecastKind = "dome" | "sun" | "moon" | "partlySun" | "partlyMoon" | "cloud" | "fog" | "rain" | "storm" | "snow" | "cold" | "wind";

// ESPN's condition ids are AccuWeather's icon numbers.
const BY_CODE: Record<ForecastKind, number[]> = {
  dome: [],
  sun: [1, 2, 30],
  moon: [33, 34],
  partlySun: [3, 4, 5],
  partlyMoon: [35, 36, 37],
  cloud: [6, 7, 8, 38],
  fog: [11],
  rain: [12, 13, 14, 18, 39, 40],
  storm: [15, 16, 17, 41, 42],
  snow: [19, 20, 21, 22, 23, 24, 25, 26, 29, 43, 44],
  cold: [31],
  wind: [32],
};

// What to draw next to a game: a dome for an indoor stadium, otherwise the forecast. Null with no forecast.
export function forecastIcon(venue: Venue, forecast: Forecast | null): { kind: ForecastKind; label: string } | null {
  if (venue.indoor) return { kind: "dome", label: "Indoors" };
  if (!forecast) return null;
  const kind = (Object.keys(BY_CODE) as ForecastKind[]).find((k) => BY_CODE[k].includes(forecast.code)) ?? "cloud";
  const label = forecast.temperature === null ? forecast.label : `${forecast.label}, ${forecast.temperature}\u00b0`;
  return { kind, label };
}
