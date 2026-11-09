import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import type { Profile } from "./types";
import type { PermissionKey } from "./permissions";

// getUser() validates the token with the Auth server. Never trust getSession() on the server.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_path, created_at, account_status")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export type AccountRole = "owner" | "staff" | "customer";

export const getRole = cache(async (): Promise<AccountRole> => {
  const user = await getUser();
  if (!user) return "customer";
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data?.role === "owner") return "owner";
  return data ? "staff" : "customer";
});

// Requires a signed-in, non-blocked account.
export async function requireUser(next = "/account") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  if (profile?.account_status === "blocked") redirect("/forbidden?reason=blocked");
  return user;
}

// Authority comes from the database function has_permission(), not from the browser.
export async function requirePermission(key: PermissionKey, next = "/admin") {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", { p: key });
  if (error || data !== true) redirect("/forbidden");
  return user;
}

export async function requireOwner(next = "/admin") {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_owner");
  if (error || data !== true) redirect("/forbidden");
  return user;
}
