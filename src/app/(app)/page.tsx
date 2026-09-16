import Link from "next/link";
import { removePick } from "@/app/actions";
import { ErrorBanner } from "@/components/error-banner";
import { LiveRefresh } from "@/components/live-refresh";
import { LocalTime } from "@/components/local-time";
import { getCurrentParlay, getProfiles, getViewer } from "@/lib/data";
import { describeOutcome, marketLabel } from "@/lib/odds";
import { formatPrice, parlayPrice } from "@/lib/rules";

export default async function Home(props: PageProps<"/">) {
  const [viewer, current, profiles] = await Promise.all([getViewer(), getCurrentParlay(), getProfiles()]);
  const nameOf = new Map(profiles.map((p) => [p.id, p.display_name]));

  if (!current) {
    return (
      <main className="card text-sm text-zinc-300">
        No parlay yet.{" "}
        {viewer.is_admin ? (
          <Link href="/admin" className="text-emerald-400 underline">
            Start one
          </Link>
        ) : (
          "Waiting for the admin to start one."
        )}
      </main>
    );
  }

  const { parlay, picks } = current;
  const isOpen = parlay.status === "open";
  const isBetter = viewer.id === parlay.better_id;
  const myPick = picks.find((p) => p.picker_id === viewer.id);
  const canPick = isOpen && viewer.is_member && !isBetter && !myPick;
  const pickedIds = new Set(picks.map((p) => p.picker_id));
  const waitingOn = profiles.filter((p) => p.is_member && p.id !== parlay.better_id && !pickedIds.has(p.id));
  const total = parlayPrice(picks.map((p) => p.price));

  return (
    <main className="flex flex-col gap-4">
      <LiveRefresh />
      <ErrorBanner searchParams={props.searchParams} />

      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{parlay.title}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Better: <span className="font-medium text-zinc-100">{nameOf.get(parlay.better_id)}</span>
            </p>
          </div>
          <div className="text-right">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                isOpen ? "bg-emerald-950 text-emerald-300" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {parlay.status}
            </span>
            <p className="mt-2 font-mono text-2xl font-bold">{total === null ? "—" : formatPrice(total)}</p>
            <p className="text-xs text-zinc-500">
              {picks.length} leg{picks.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {canPick && (
          <Link href="/pick" className="btn mt-4 w-full">
            Make your pick
          </Link>
        )}
        {isBetter && (
          <p className="mt-4 text-sm text-zinc-400">You&apos;re the Better this round. The Pickers build it, you place it.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        {picks.map((pick) => (
          <div key={pick.id} className="card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">
                {nameOf.get(pick.picker_id)} · {marketLabel(pick.market)}
              </p>
              <p className="font-semibold">
                {describeOutcome(pick.market, {
                  name: pick.selection,
                  description: pick.player ?? undefined,
                  point: pick.point ?? undefined,
                  price: pick.price,
                })}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {pick.away_team} @ {pick.home_team} · <LocalTime iso={pick.commence_time} />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-mono font-semibold">{formatPrice(pick.price)}</span>
              {pick.picker_id === viewer.id && isOpen && (
                <form action={removePick}>
                  <input type="hidden" name="pickId" value={pick.id} />
                  <button className="text-xs text-zinc-400 underline hover:text-red-300">Remove</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </section>

      {isOpen && waitingOn.length > 0 && (
        <p className="text-sm text-zinc-500">Waiting on: {waitingOn.map((p) => p.display_name).join(", ")}</p>
      )}
    </main>
  );
}
