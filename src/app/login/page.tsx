import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ErrorBanner } from "@/components/error-banner";
import { safeNext } from "@/lib/action-helpers";
import { getRoster } from "@/lib/live/players";
import { playerBySlug } from "@/lib/players";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { signInWithPin } from "./actions";

export const metadata: Metadata = { title: "Sign in | Low-T Parlay", robots: { index: false, follow: false } };

export default async function Login(props: PageProps<"/login">) {
  const { as, next: rawNext } = await props.searchParams;
  const next = typeof rawNext === "string" ? safeNext(rawNext) : null;

  // Already signed in: skip the form.
  const me = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (me && playerBySlug(me)) redirect(next ?? `/${me}`);

  const roster = await getRoster();
  const chosen = typeof as === "string" ? roster.find((p) => p.slug === as.toLowerCase()) : undefined;
  const nextQuery = next ? `&next=${encodeURIComponent(next)}` : "";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Low-T <span className="text-emerald-400">Parlay</span>
      </h1>
      <ErrorBanner searchParams={props.searchParams} />

      {chosen ? (
        <form action={signInWithPin} className="card flex flex-col items-center gap-3">
          {chosen.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chosen.photoUrl} alt="" className="size-24 rounded-full object-cover ring-2 ring-zinc-700" />
          )}
          <p className="text-lg font-bold">{chosen.name}</p>
          <input type="hidden" name="slug" value={chosen.slug} />
          {next && <input type="hidden" name="next" value={next} />}
          <div className="w-full">
            <label htmlFor="pin" className="label">
              4-digit PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              autoComplete="off"
              autoFocus
              required
              className="input text-center font-mono text-xl tracking-[0.5em]"
            />
          </div>
          <button className="btn w-full">Sign in</button>
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-xs text-zinc-400 underline">
            Not {chosen.name}?
          </Link>
        </form>
      ) : (
        <>
          <p className="text-sm text-zinc-400">Who are you?</p>
          <ul className="grid grid-cols-3 gap-3">
            {roster.map((p) => (
              <li key={p.slug}>
                <Link href={`/login?as=${p.slug}${nextQuery}`} className="flex flex-col items-center gap-1.5 hover:opacity-80">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt="" className="size-16 rounded-full object-cover ring-2 ring-zinc-700" />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-zinc-300 ring-2 ring-zinc-700">
                      {p.name[0]}
                    </div>
                  )}
                  <span className="w-full truncate text-center text-xs font-semibold text-zinc-300">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
