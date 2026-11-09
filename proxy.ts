import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

// Next.js 16: this file replaces middleware.ts.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
