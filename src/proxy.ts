import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { playerBySlug } from "@/lib/players";

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

  // /live-board is the unlisted shared tracker. Its edit page checks a key.
  // Player profiles (/rodgers) and their photos are open too until sign-in covers them.
  const open =
    ["/login", "/live-board", "/players/"].some((p) => request.nextUrl.pathname.startsWith(p)) ||
    !!playerBySlug(request.nextUrl.pathname.slice(1));
  if (!data?.claims && !open) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
