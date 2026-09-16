import { ErrorBanner } from "@/components/error-banner";
import { getCurrentParlay, getProfiles, requireAdmin } from "@/lib/data";
import { createParlay, setBetter, setMembership, setParlayStatus } from "./actions";

export default async function Admin(props: PageProps<"/admin">) {
  await requireAdmin();
  const [profiles, current] = await Promise.all([getProfiles(), getCurrentParlay()]);
  const members = profiles.filter((p) => p.is_member);
  const parlay = current?.parlay;
  const hasOpen = parlay?.status === "open";

  const betterSelect = (defaultValue?: string) => (
    <select name="betterId" defaultValue={defaultValue} required className="input">
      <option value="">Choose the Better…</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.display_name}
        </option>
      ))}
    </select>
  );

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Admin</h1>
      <ErrorBanner searchParams={props.searchParams} />

      {parlay && (
        <section className="card flex flex-col gap-3">
          <h2 className="label">Current parlay: {parlay.title}</h2>
          <form action={setBetter} className="flex gap-2">
            <input type="hidden" name="parlayId" value={parlay.id} />
            {betterSelect(parlay.better_id)}
            <button className="btn shrink-0">Set Better</button>
          </form>
          <form action={setParlayStatus}>
            <input type="hidden" name="parlayId" value={parlay.id} />
            <input type="hidden" name="status" value={hasOpen ? "locked" : "open"} />
            <button className="btn-ghost">{hasOpen ? "Lock parlay" : "Reopen parlay"}</button>
          </form>
        </section>
      )}

      {!hasOpen && (
        <section className="card">
          <h2 className="label">Start a new parlay</h2>
          <form action={createParlay} className="flex flex-col gap-2">
            <input name="title" placeholder="e.g. Week 3" required className="input" />
            {betterSelect()}
            <button className="btn">Open parlay</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2 className="label">Group</h2>
        <ul className="divide-y divide-zinc-800">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {p.display_name}
                  {p.is_admin && <span className="ml-2 text-xs text-emerald-400">admin</span>}
                  {parlay?.better_id === p.id && <span className="ml-2 text-xs text-amber-300">Better</span>}
                </p>
                <p className="truncate text-xs text-zinc-500">{p.email}</p>
              </div>
              <form action={setMembership}>
                <input type="hidden" name="profileId" value={p.id} />
                <input type="hidden" name="isMember" value={String(!p.is_member)} />
                <button className="btn-ghost shrink-0">{p.is_member ? "Remove" : "Approve"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
