import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { safeNext } from "../../../lib/auth/validation";
import { getSiteUrl } from "../../../lib/auth/site-url";

// Landing point of the links in confirmation and password-recovery emails.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const base = await getSiteUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }

  const failed = next === "/reset-password" ? "/forgot-password?error=link" : "/login?error=link";
  return NextResponse.redirect(`${base}${failed}`);
}
