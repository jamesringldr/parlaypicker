import { ErrorBanner } from "@/components/error-banner";
import { sendCode, verifyCode } from "./actions";

export default async function Login(props: PageProps<"/login">) {
  const { email } = await props.searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Parlay<span className="text-emerald-400">Picker</span>
      </h1>
      <ErrorBanner searchParams={props.searchParams} />

      {typeof email === "string" ? (
        <form action={verifyCode} className="card flex flex-col gap-3">
          <p className="text-sm text-zinc-300">
            We emailed a code to <span className="font-medium">{email}</span>.
          </p>
          <input type="hidden" name="email" value={email} />
          <div>
            <label htmlFor="token" className="label">
              Code
            </label>
            <input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="input font-mono tracking-widest"
            />
          </div>
          <button className="btn">Sign in</button>
          <a href="/login" className="text-center text-xs text-zinc-400 underline">
            Use a different email
          </a>
        </form>
      ) : (
        <form action={sendCode} className="card flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="displayName" className="label">
              Your name (first time only)
            </label>
            <input id="displayName" name="displayName" autoComplete="given-name" className="input" />
          </div>
          <button className="btn">Email me a code</button>
        </form>
      )}
    </main>
  );
}
