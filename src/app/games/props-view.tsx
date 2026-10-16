import { ChevronDown } from "lucide-react";
import { nickname } from "@/lib/live/teams";
import { PROP_TABS, type PropTab } from "@/lib/odds/props";
import type { TabProps } from "@/lib/odds/props-store";
import { formatPrice } from "@/lib/rules";
import { kickoffLabel, Line } from "./shared";

// Player props from the last scheduled pull, one collapsible card per game.
export function PropsView({ tab, props }: { tab: PropTab; props: TabProps | null }) {
  const { label, yards } = PROP_TABS[tab];

  if (!props) {
    return (
      <p className="card text-sm text-zinc-400">
        Props haven&apos;t been pulled yet. They&apos;re pulled at noon Central on Tuesday, Wednesday and Thursday.
      </p>
    );
  }
  if (props.games.length === 0) {
    return <p className="card text-sm text-zinc-400">No {label.toLowerCase()} props are up for the games left this week.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {props.games.map(({ game, rows }) => (
          <details key={game.eventId} className="group rounded-2xl border border-zinc-800 bg-zinc-900">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">
                  {nickname(game.awayTeam)} @ {nickname(game.homeTeam)}
                </p>
                <p className="text-sm text-zinc-400">
                  {kickoffLabel(game.commenceTime)} · {rows.length} {rows.length === 1 ? "player" : "players"}
                </p>
              </div>
              <ChevronDown className="size-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="border-t border-zinc-800 px-4">
              {rows.map((r) => (
                <li key={`${r.player}|${r.point}`} className="flex items-center justify-between gap-3 border-b border-zinc-800 py-2 last:border-b-0">
                  <p className="min-w-0 truncate font-semibold">{r.player}</p>
                  <div className="flex shrink-0 gap-1.5">
                    {yards ? (
                      <>
                        <Line top={r.point === null ? "-" : `o${r.point}`} bottom={r.over === null ? "" : formatPrice(r.over)} />
                        <Line top={r.point === null ? "-" : `u${r.point}`} bottom={r.under === null ? "" : formatPrice(r.under)} />
                      </>
                    ) : (
                      <Line top={r.yes === null ? "-" : formatPrice(r.yes)} bottom="Anytime" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <p className="text-center text-xs text-zinc-500">
        FanDuel props, pulled {kickoffLabel(props.fetchedAt)} CT. Refreshed Tue, Wed and Thu at noon.
      </p>
    </>
  );
}
