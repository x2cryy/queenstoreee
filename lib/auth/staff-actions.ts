"use server";

import { createClient } from "../supabase/server";
import { requireOwner } from "./session";
import { PERMISSION_KEYS } from "./permissions";

// Owner-only staff management. Each call re-checks ownership here AND the SQL
// functions check is_owner() again, so a forged request cannot bypass either layer.
// UI for these comes in Phase 4.

type Result = { ok: boolean; message: string };

function cleanPermissions(input: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) if (key in input) out[key] = input[key] === true;
  return out;
}

function mapError(code?: string): string {
  switch (code) {
    case "42501": return "هذه العملية للمالكة فقط.";
    case "P0002": return "لا يوجد حساب مفعّل بهذا البريد. يجب أن ينشئ الشخص حسابه ويؤكد بريده أولاً.";
    case "23505": return "هذا الحساب إداري بالفعل.";
    case "22023": return "صلاحيات غير صالحة.";
    default: return "تعذر تنفيذ العملية.";
  }
}

export async function grantStaff(email: string, permissions: Record<string, boolean>): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_staff", {
    p_email: email,
    p_permissions: cleanPermissions(permissions),
  });
  return error ? { ok: false, message: mapError(error.code) } : { ok: true, message: "تمت إضافة المدير." };
}

export async function setStaffPermissions(userId: string, permissions: Record<string, boolean>): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_staff_permissions", {
    p_user_id: userId,
    p_permissions: cleanPermissions(permissions),
  });
  return error ? { ok: false, message: mapError(error.code) } : { ok: true, message: "تم تحديث الصلاحيات." };
}

export async function revokeStaff(userId: string): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_staff", { p_user_id: userId });
  return error ? { ok: false, message: mapError(error.code) } : { ok: true, message: "تم سحب الصلاحيات الإدارية." };
}

export async function listStaff() {
  await requireOwner();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_staff");
  return error ? [] : (data ?? []);
}
