import type { Metadata } from "next";

export const metadata: Metadata = { title: "Games | Low-T Parlay", robots: { index: false, follow: false } };

export default function Games() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold tracking-tight">
        Games
      </h1>
      <p className="card text-sm text-zinc-400">Coming soon: pick your games and legs here.</p>
    </main>
  );
}
