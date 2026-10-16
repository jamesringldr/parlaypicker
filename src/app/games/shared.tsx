// "Sun 10/18 8:30am", in Central time like the rest of the site.
export function kickoffLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")}/${get("day")} ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()}`;
}

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// One tappable-looking line: the number on top, the price under it.
export function Line({ top, bottom, className = "w-[4.1rem] shrink-0" }: { top: string; bottom: string; className?: string }) {
  return (
    <div className={`${className} rounded-lg bg-zinc-800 py-1.5 text-center`}>
      <p className="text-sm font-bold leading-tight">{top}</p>
      <p className="text-xs leading-tight text-zinc-400">{bottom}</p>
    </div>
  );
}


// "OCT 18" and "8:30 AM", in Central time, for the stacked date block on a game card.
export function kickoffParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("month")} ${get("day")}`.toUpperCase(),
    time: `${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`,
  };
}

// "Sunday 8:30am", in Central time, for the line between the two teams on a game's header.
export function kickoffLong(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()}`;
}
