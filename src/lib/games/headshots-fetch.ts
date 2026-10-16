import "server-only";

const NFL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const CONCURRENCY = 8;

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`ESPN request failed (${response.status}).`);
  return response.json();
}

// Every team's roster. ESPN occasionally answers a roster with nothing, so each team gets a second try.
// A team that still fails is skipped, and its players just show an initial.
export async function fetchRosters(): Promise<unknown[]> {
  const teams = (await getJson(`${NFL}/teams?limit=40`)) as {
    sports?: { leagues?: { teams?: { team?: { id?: string } }[] }[] }[];
  };
  const ids = (teams.sports?.[0]?.leagues?.[0]?.teams ?? []).flatMap((t) => (t.team?.id ? [t.team.id] : []));

  const rosters: unknown[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      ids.slice(i, i + CONCURRENCY).map(async (id) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            return await getJson(`${NFL}/teams/${id}/roster`);
          } catch {
            // Try once more.
          }
        }
        return null;
      }),
    );
    rosters.push(...batch.filter((r) => r !== null));
  }
  return rosters;
}
