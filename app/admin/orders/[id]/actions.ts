"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "../../../../lib/auth/session";
import { createClient } from "../../../../lib/supabase/server";
import { adminErrorMessage, type AdminActionState } from "../../../../lib/admin/orders";
import { normalizePhone } from "../../../../lib/shop/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txt = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

function toAmount(raw: string): number | null {
  const d = normalizePhone(raw).replace(/[^0-9]/g, "");
  if (!d) return null;
  const n = Number(d);
  return Number.isSafeInteger(n) ? n : null;
}

function done(id: string, message: string): AdminActionState {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/live");
  revalidatePath("/admin/orders/manage");
  return { ok: true, message };
}

const BAD: AdminActionState = { ok: false, message: "بيانات غير صالحة." };

export async function changeStatus(_p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const id = txt(fd.get("order_id"));
  const to = txt(fd.get("to"));
  const note = txt(fd.get("note")).slice(0, 500);
  const restock = fd.get("restock") === "on";
  if (!UUID.test(id) || !to) return BAD;
  await requirePermission("orders", `/admin/orders/${id}`);
  const sb = await createClient();
  const { error } = await sb.rpc("set_order_status", {
    p_order_id: id,
    p_to: to,
    p_note: note || null,
    p_restock: restock,
  });
  if (error) return { ok: false, message: adminErrorMessage(error.message) };
  return done(id, "تم تحديث حالة الطلب.");
}

export async function addNote(_p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const id = txt(fd.get("order_id"));
  const body = txt(fd.get("body"));
  if (!UUID.test(id)) return BAD;
  if (body.length < 1 || body.length > 1000) return { ok: false, message: adminErrorMessage("invalid_note") };
  await requirePermission("orders", `/admin/orders/${id}`);
  const sb = await createClient();
  const { error } = await sb.rpc("add_order_note", { p_order_id: id, p_body: body });
  if (error) return { ok: false, message: adminErrorMessage(error.message) };
  return done(id, "تمت إضافة الملاحظة الداخلية.");
}

export async function setDelivery(_p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const id = txt(fd.get("order_id"));
  const feeRaw = txt(fd.get("fee"));
  const notes = txt(fd.get("notes")).slice(0, 500);
  if (!UUID.test(id)) return BAD;
  const fee = feeRaw ? toAmount(feeRaw) : null;
  if (feeRaw && fee === null) return { ok: false, message: adminErrorMessage("invalid_amount") };
  await requirePermission("orders", `/admin/orders/${id}`);
  const sb = await createClient();
  const { error } = await sb.rpc("set_order_delivery", {
    p_order_id: id,
    p_fee: fee,
    p_notes: notes || null,
  });
  if (error) return { ok: false, message: adminErrorMessage(error.message) };
  return done(id, "تم حفظ بيانات التوصيل وتحديث الإجمالي.");
}

export async function recordPayment(_p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const id = txt(fd.get("order_id"));
  const method = txt(fd.get("method"));
  const ref = txt(fd.get("reference")).slice(0, 120);
  const amount = toAmount(txt(fd.get("amount")));
  if (!UUID.test(id)) return BAD;
  if (method !== "cod" && method !== "manual") return { ok: false, message: adminErrorMessage("invalid_payment") };
  if (amount === null || amount <= 0) return { ok: false, message: adminErrorMessage("invalid_amount") };
  await requirePermission("orders", `/admin/orders/${id}`);
  const sb = await createClient();
  const { error } = await sb.rpc("record_order_payment", {
    p_order_id: id,
    p_amount: amount,
    p_method: method,
    p_reference: ref || null,
  });
  if (error) return { ok: false, message: adminErrorMessage(error.message) };
  return done(id, "تم تسجيل الدفعة وتحديث حالة الدفع.");
}
