const CENTRAL = "America/Chicago";

function centralParts(at: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
    timeZone: CENTRAL,
  }).formatToParts(new Date(at));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    hour: Number(get("hour")),
  };
}

// The moment it is `hour`:00 Central on a calendar date. Central is UTC-5 or UTC-6, so one of those two is right.
function centralInstant(year: number, month: number, day: number, hour: number): number {
  for (const offset of [5, 6]) {
    const at = Date.UTC(year, month - 1, day, hour + offset);
    if (centralParts(at).hour === hour) return at;
  }
  return Date.UTC(year, month - 1, day, hour + 6);
}

// Picks are due Thursday at 5pm Central. A pick week runs Tuesday to Monday (the board is archived Tuesday), so
// this is the Thursday of the current week: coming up from Tuesday to Thursday, already gone from Thursday night on.
export function pickDeadline(now: number): number {
  const { year, month, day, weekday } = centralParts(now);
  const sinceTuesday = (weekday - 2 + 7) % 7;
  const thursday = new Date(Date.UTC(year, month - 1, day - sinceTuesday + 2));
  return centralInstant(thursday.getUTCFullYear(), thursday.getUTCMonth() + 1, thursday.getUTCDate(), 17);
}
