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
export function Line({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="w-[4.1rem] shrink-0 rounded-lg bg-zinc-800 py-1.5 text-center">
      <p className="text-sm font-bold leading-tight">{top}</p>
      <p className="text-xs leading-tight text-zinc-400">{bottom}</p>
    </div>
  );
}

