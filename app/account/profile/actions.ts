"use server";

import { createClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/auth/session";
import type { FormState } from "../../../lib/auth/types";
import { cleanPhone, validateFullName } from "../../../lib/auth/validation";

// Customers may change ONLY full_name and phone. Role, status and admin data are not
// accepted here, and the database blocks them too (RLS + guard trigger).
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/account/profile");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "");
  const values = { full_name: fullName, phone: phoneRaw };

  const fieldErrors: Record<string, string> = {};
  const nameErr = validateFullName(fullName);
  if (nameErr) fieldErrors.full_name = nameErr;
  const phone = cleanPhone(phoneRaw);
  if (phone.error) fieldErrors.phone = phone.error;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone.value, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: "تعذر حفظ التغييرات. حاول مرة أخرى.", values };
  }
  return { ok: true, message: "تم حفظ بياناتك.", values };
}
