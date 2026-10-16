import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { timeAgo } from "@/lib/activity";
import { getActivity, getRole } from "@/lib/live/activity-store";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const metadata: Metadata = { title: "Activity | Low-T Parlay", robots: { index: false, follow: false } };

// Central time, like the rest of the site.
const when = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

// Who has signed in and who's been around. Super admin only. Anyone else gets a plain 404.
export default async function Activity() {
  await connection();
  const me = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if ((await getRole(me)) !== "super_admin") notFound();

  const { rows, at: now } = await getActivity();
  const seen = rows.filter((r) => r.lastSeenAt).length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Activity</h1>
        <Link href={`/${me}`} className="text-sm text-blue-400 hover:underline">
          My Legs
        </Link>
      </header>

      <p className="text-sm text-zinc-400">
        <span className="text-xl font-bold text-zinc-100">{seen}</span> of {rows.length} have signed in
        {seen < rows.length && <span className="text-amber-300"> · {rows.length - seen} haven&apos;t yet</span>}
      </p>

      <ul className="card !p-0">
        {rows.map((r) => (
          <li key={r.slug} className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 last:border-b-0">
            <Avatar name={r.name} photoUrl={r.photoUrl} className="size-10 text-base" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{r.name}</p>
              {r.lastSeenAt ? (
                <>
                  <p className="text-sm text-zinc-300">Last seen {timeAgo(r.lastSeenAt, now)}</p>
                  <p className="text-xs text-zinc-500">{when.format(new Date(r.lastSeenAt))}</p>
                </>
              ) : (
                <p className="text-sm text-zinc-500">Hasn&apos;t signed in</p>
              )}
            </div>
            <p className="shrink-0 text-right text-xs text-zinc-400">
              {r.loginCount > 0 ? (
                <>
                  <span className="text-sm font-semibold text-zinc-100">{r.loginCount}</span> sign-in{r.loginCount === 1 ? "" : "s"}
                </>
              ) : r.lastSeenAt ? (
                "signed in earlier"
              ) : (
                ""
              )}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">
        Counts start from when tracking was added. A sign-in lasts about 13 months, so someone who signed in before then shows
        &quot;signed in earlier&quot; once they next open the site.
      </p>
    </main>
  );
}
