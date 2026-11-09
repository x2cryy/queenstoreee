import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { PERMISSION_KEYS, type PermissionKey } from "../auth/permissions";
import { getRole, requireUser } from "../auth/session";

// Permissions of the current admin, checked by the database function has_permission().
export const getMyPermissions = cache(async (): Promise<PermissionKey[]> => {
  const role = await getRole();
  if (role === "owner") return [...PERMISSION_KEYS];
  if (role !== "staff") return [];
  const supabase = await createClient();
  const results = await Promise.all(
    PERMISSION_KEYS.map(async (k) => {
      const { data, error } = await supabase.rpc("has_permission", { p: k });
      return !error && data === true ? k : null;
    })
  );
  return results.filter((k): k is PermissionKey => k !== null);
});

// Server-side gate for admin pages: needs at least one of the given permissions.
export async function requireAnyPermission(keys: PermissionKey[]) {
  await requireUser("/admin");
  const mine = await getMyPermissions();
  if (!keys.some((k) => mine.includes(k))) redirect("/forbidden");
}
