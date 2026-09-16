import Link from "next/link";
import { signOut } from "@/app/actions";
import { getViewer } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-12">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Parlay<span className="text-emerald-400">Picker</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {viewer.is_admin && (
            <Link href="/admin" className="btn-ghost">
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button className="btn-ghost">Sign out</button>
          </form>
        </nav>
      </header>
      {viewer.is_member || viewer.is_admin ? (
        children
      ) : (
        <div className="card text-sm text-zinc-300">
          Thanks, {viewer.display_name}. An admin needs to add you to the group before you can see the parlay.
        </div>
      )}
    </div>
  );
}
