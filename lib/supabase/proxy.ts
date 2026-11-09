import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

// Only these areas need a session. Everything else (store browsing) stays public.
const PROTECTED_PREFIXES = ["/account", "/admin"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Refreshes the auth cookies on every request and redirects visitors away from
// protected areas. This is a convenience layer only: real authorization is
// enforced again in server code (lib/auth/session.ts) and in the database (RLS).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = !!data?.claims;
  } catch {
    signedIn = false;
  }

  const { pathname, search } = request.nextUrl;
  if (!signedIn && isProtected(pathname)) {
    const hadSession = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
    const target = request.nextUrl.clone();
    target.pathname = hadSession ? "/session-expired" : "/login";
    target.search = "";
    target.searchParams.set("next", pathname + search);
    return NextResponse.redirect(target);
  }

  return response;
}
