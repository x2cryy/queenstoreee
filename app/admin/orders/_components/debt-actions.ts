"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { createClient } from "../../../../lib/supabase/server";

export type SaveDebtResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (message: string): SaveDebtResult => ({ ok: false, message });

export async function saveOrderAsDebt(input: {
  orderId: string;
  amount: number;
  due: string;
  note: string;
  idem: string;
}): Promise<SaveDebtResult> {
  await requireAnyPermission(["store_debts"]);

  const orderId = String(input?.orderId ?? "");
  const amount = Math.round(Number(input?.amount));
  const due = String(input?.due ?? "").trim();
  const note = String(input?.note ?? "").trim().slice(0, 500);
  const idem = String(input?.idem ?? "").trim();

  if (!UUID.test(orderId)) return fail("طلب غير صالح");
  if (!Number.isFinite(amount) || amount <= 0) return fail("مبلغ الدين يجب أن يكون أكبر من صفر");
  if (due && !DATE.test(due)) return fail("تاريخ الاستحقاق غير صالح");
  if (idem.length < 8 || idem.length > 80) return fail("طلب غير صالح، أعد فتح النافذة");

  try {
    const s = await createClient();
    const { data: o, error: oe } = await s
      .from("orders")
      .select("id,order_number,customer_id,customer_name,status")
      .eq("id", orderId)
      .maybeSingle();
    if (oe || !o) return fail("تعذّر قراءة الطلب");
    if (o.status === "cancelled" || o.status === "returned") {
      return fail("لا يمكن حفظ دين على طلب ملغي أو مرتجع");
    }

    const { data: room, error: re } = await s.rpc("fin_order_room", { p_order: orderId });
    if (re) return fail("تعذّر حساب المتاح للدين");
    if (amount > (Number(room) || 0)) return fail("المبلغ أكبر من المتاح للدين على هذا الطلب");

    const { error } = await s.rpc("add_store_debt", {
      p_customer: o.customer_id,
      p_party: o.customer_name,
      p_amount: amount,
      p_debt_date: null,
      p_due: due || null,
      p_order: orderId,
      p_reason: "دين على الطلب " + o.order_number,
      p_notes: note || null,
      p_idem: "order-debt:" + orderId + ":" + idem,
    });
    if (error) {
      const m = String(error.message ?? "").toLowerCase();
      if (m.includes("not allowed")) return fail("ليست لديك صلاحية الديون");
      if (m.includes("exceeds")) return fail("المبلغ أكبر من المتاح للدين على هذا الطلب");
      if (m.includes("store_debts_check")) return fail("تاريخ الاستحقاق قبل تاريخ الدين");
    if (m.includes("store_debts_order_active_uq")) return fail("هذا الطلب محفوظ كدين بالفعل.");
      return fail("تعذّر حفظ الدين");
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin/debts/store");
    return { ok: true, message: "تم حفظ الدين" };
  } catch {
    return fail("تعذّر حفظ الدين، حاول مرة ثانية");
  }
}
