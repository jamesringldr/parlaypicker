import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { getPastWeeks, LIVE_PATH } from "@/lib/live/board";
import { getRoster } from "@/lib/live/players";
import { formatRecord } from "@/lib/players";
import { badges as streakBadges, BADGE_EMOJI, extremes, standings, type Badge, type Standing } from "@/lib/stats";

const percent = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);

export const metadata: Metadata = { title: "Low-T Parlay", robots: { index: false, follow: false } };

const badgeOf = (badges: Map<string, Badge>, slug: string) => {
  const badge = badges.get(slug);
  return badge ? BADGE_EMOJI[badge] : undefined;
};

function PickerCard({
  title,
  tone,
  rows,
  photos,
  badges,
}: {
  title: string;
  tone: string;
  rows: Standing[];
  photos: Map<string, string | null>;
  badges: Map<string, Badge>;
}) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className={`label !mb-0 ${tone}`}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Nobody yet.</p>
      ) : (
        rows.map((r) => (
          <Link key={r.slug} href={`/${r.slug}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar
              name={r.name}
              photoUrl={photos.get(r.slug) ?? null}
              className="size-12 text-lg"
              badge={badgeOf(badges, r.slug)}
            />
            <div className="min-w-0">
              <p className="truncate font-bold">{r.name}</p>
              <p className="text-xs text-zinc-400">
                {formatRecord(r.record)} · {percent(r.rate)}
              </p>
            </div>
          </Link>
        ))
      )}
    </section>
  );
}

export default async function Home() {
  await connection();
  const [weeks, roster] = await Promise.all([getPastWeeks(), getRoster()]);
  const photos = new Map(roster.map((p) => [p.slug, p.photoUrl]));

  const results = weeks.map((w) => ({ weekNumber: w.weekNumber, legs: w.legs }));
  const rows = standings(results);
  const { best, worst } = extremes(rows);
  const badges = streakBadges(results);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Low-T <span className="text-emerald-400">Parlay</span>
          </h1>
          <p className="text-sm text-zinc-500">
            {weeks.length} week{weeks.length === 1 ? "" : "s"} played
          </p>
        </div>
        <Link href={LIVE_PATH} className="btn shrink-0">
          Live Board
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <PickerCard title="🦈 Sharks" tone="!text-emerald-400" rows={best} photos={photos} badges={badges} />
        <PickerCard title="💩 Shitters" tone="!text-red-400" rows={worst} photos={photos} badges={badges} />
      </div>

      <section className="card">
        <h2 className="label">Leaderboard</h2>
        <ol>
          {rows.map((r, i) => (
            <li key={r.slug}>
              <Link href={`/${r.slug}`} className="flex items-center gap-3 border-b border-zinc-800 py-2 last:border-b-0 hover:opacity-80">
                <span className="w-5 text-center text-sm font-semibold text-zinc-500">{i + 1}</span>
                <Avatar
                  name={r.name}
                  photoUrl={photos.get(r.slug) ?? null}
                  className="size-9 text-sm"
                  badge={badgeOf(badges, r.slug)}
                />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                <span className="text-sm text-zinc-400">{formatRecord(r.record)}</span>
                <span className="w-10 text-right text-sm font-bold">{percent(r.rate)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <Link href="/live-board/past-weeks" className="text-center text-sm text-blue-400 hover:underline">
        Every week&apos;s parlay
      </Link>
    </main>
  );
}
