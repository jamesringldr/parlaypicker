import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { SEEN_COOKIE, SEEN_EVERY_SECONDS, touchLastSeen } from "@/lib/activity";
import { playerBySlug } from "@/lib/players";
import { readSession, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

// Refreshes the Supabase session cookie and sends signed-out users to /login.
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const player = readSession(request.cookies.get(SESSION_COOKIE)?.value);

  // The stats home, Games, Bet Slip, the live board and player profiles (/rodgers) need a PIN sign-in.
  // The live board's edit page is the exception: it has its own key. Photos stay open.
  const liveBoard = pathname.startsWith("/live-board") && !pathname.startsWith("/live-board/edit");
  if (pathname === "/" || pathname.startsWith("/games") || pathname.startsWith("/bet-slip") || pathname.startsWith("/activity") || liveBoard || playerBySlug(pathname.slice(1))) {
    if (!player) {
      const login = new URL("/login", request.url);
      // Keep the query too, so signing in lands on the same tab (/live-board?tab=settled).
      login.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
  } else {
    const open = ["/login", "/live-board/edit", "/players/", "/api/cron/"].some((p) => pathname.startsWith(p));
    if (!data?.claims && !open) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Keep signed-in players signed in: every visit pushes the expiry out again.
  if (player) {
    response.cookies.set(SESSION_COOKIE, signSession(player), sessionCookieOptions);

    // Note that they're around, at most once an hour per device, on page loads only (not photos), and in
    // the background so the page isn't held up.
    if (!request.cookies.get(SEEN_COOKIE) && request.headers.get("accept")?.includes("text/html")) {
      event.waitUntil(touchLastSeen(player));
      response.cookies.set(SEEN_COOKIE, "1", { ...sessionCookieOptions, maxAge: SEEN_EVERY_SECONDS });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
