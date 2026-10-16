import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Dome, Moon, Snowflake, Sun, Wind, type LucideIcon } from "lucide-react";
import type { Forecast, Venue } from "@/lib/games/espn-games";
import { forecastIcon, type ForecastKind } from "@/lib/games/forecast";

const ICONS: Record<ForecastKind, LucideIcon> = {
  dome: Dome,
  sun: Sun,
  moon: Moon,
  partlySun: CloudSun,
  partlyMoon: CloudMoon,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow,
  cold: Snowflake,
  wind: Wind,
};

// A dome for an indoor stadium, otherwise the forecast. Nothing when there's neither.
export function ForecastIcon({ venue, forecast, className = "size-4" }: { venue: Venue; forecast: Forecast | null; className?: string }) {
  const icon = forecastIcon(venue, forecast);
  if (!icon) return null;
  const Icon = ICONS[icon.kind];
  return (
    <span title={icon.label} className="inline-flex">
      <Icon className={className} role="img" aria-label={icon.label} />
    </span>
  );
}
