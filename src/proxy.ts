import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { playerBySlug } from "@/lib/players";
import { readSession, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

// Refreshes the Supabase session cookie and sends signed-out users to /login.
export async function proxy(request: NextRequest) {
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

  // The stats home, Games, Bet Slip and player profiles (/rodgers) need a PIN sign-in. Photos stay open.
  if (pathname === "/" || pathname.startsWith("/games") || pathname.startsWith("/bet-slip") || playerBySlug(pathname.slice(1))) {
    if (!player) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  } else {
    // /live-board is the unlisted shared tracker. Its edit page checks a key.
    const open = ["/login", "/live-board", "/players/", "/api/cron/"].some((p) => pathname.startsWith(p));
    if (!data?.claims && !open) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Keep signed-in players signed in: every visit pushes the expiry out again.
  if (player) response.cookies.set(SESSION_COOKIE, signSession(player), sessionCookieOptions);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
