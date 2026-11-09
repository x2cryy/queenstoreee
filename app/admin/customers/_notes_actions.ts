"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type NoteState = { ok: boolean; message: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function addNoteAction(_: NoteState, f: FormData): Promise<NoteState> {
  await requireAnyPermission(["customers"]);
  const customerId = str(f, "customer_id");
  const body = str(f, "body");
  if (!customerId) return { ok: false, message: "زبون غير صالح" };
  if (!body) return { ok: false, message: "اكتب الملاحظة أولاً" };
  if (body.length > 2000) return { ok: false, message: "الملاحظة طويلة جداً (الحد 2000 حرف)" };
  const sb = await createClient();
  const { error } = await sb.from("customer_notes").insert({ customer_id: customerId, body });
  if (error) return { ok: false, message: "تعذّر حفظ الملاحظة" };
  revalidatePath("/admin/customers/" + customerId);
  return { ok: true, message: "تم حفظ الملاحظة" };
}

export async function deleteNoteAction(_: NoteState, f: FormData): Promise<NoteState> {
  await requireAnyPermission(["customers"]);
  const id = str(f, "id");
  const customerId = str(f, "customer_id");
  if (!id) return { ok: false, message: "ملاحظة غير صالحة" };
  const sb = await createClient();
  const { error } = await sb.from("customer_notes").delete().eq("id", id);
  if (error) return { ok: false, message: "تعذّر حذف الملاحظة" };
  revalidatePath("/admin/customers/" + customerId);
  return { ok: true, message: "تم حذف الملاحظة" };
}
