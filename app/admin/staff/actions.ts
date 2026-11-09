"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PERMISSION_KEYS } from "../../../lib/auth/permissions";
import {
  grantStaff,
  revokeStaff,
  setStaffPermissions,
} from "../../../lib/auth/staff-actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function failed(r: unknown): boolean {
  if (!r || typeof r !== "object") return false;
  const o = r as { ok?: unknown; error?: unknown };
  return o.ok === false || Boolean(o.error);
}

function readPerms(fd: FormData): Record<string, boolean> {
  const p: Record<string, boolean> = {};
  for (const k of PERMISSION_KEYS) p[k] = fd.get(`perm_${k}`) === "on";
  return p;
}

export async function addStaffAction(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) redirect("/admin/staff?err=email");
  const r = await grantStaff(email, readPerms(fd));
  revalidatePath("/admin/staff");
  redirect(failed(r) ? "/admin/staff?err=failed" : "/admin/staff?ok=added");
}

export async function updateStaffAction(fd: FormData) {
  const id = String(fd.get("user_id") ?? "");
  if (!UUID.test(id)) redirect("/admin/staff?err=failed");
  const r = await setStaffPermissions(id, readPerms(fd));
  revalidatePath("/admin/staff");
  redirect(failed(r) ? "/admin/staff?err=failed" : "/admin/staff?ok=updated");
}

export async function revokeStaffAction(fd: FormData) {
  const id = String(fd.get("user_id") ?? "");
  if (!UUID.test(id)) redirect("/admin/staff?err=failed");
  const r = await revokeStaff(id);
  revalidatePath("/admin/staff");
  redirect(failed(r) ? "/admin/staff?err=failed" : "/admin/staff?ok=revoked");
}
