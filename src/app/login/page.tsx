import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ErrorBanner } from "@/components/error-banner";
import { safeNext } from "@/lib/action-helpers";
import { playerBySlug } from "@/lib/players";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { signInWithPin } from "./actions";

export const metadata: Metadata = { title: "Sign in | Low-T Parlay", robots: { index: false, follow: false } };

export default async function Login(props: PageProps<"/login">) {
  const { next: rawNext } = await props.searchParams;
  const next = typeof rawNext === "string" ? safeNext(rawNext) : null;

  // Already signed in: skip the form.
  const me = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (me && playerBySlug(me)) redirect(next ?? `/${me}`);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Low-T <span className="text-emerald-400">Parlay</span>
      </h1>
      <ErrorBanner searchParams={props.searchParams} />

      <form action={signInWithPin} className="card flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="pin" className="label">
            Enter your 4-digit PIN
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
        <button className="btn">Sign in</button>
      </form>
    </main>
  );
}
