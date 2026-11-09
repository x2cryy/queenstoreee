"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";
import { getMyPermissions } from "../../../../lib/admin/access";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";
import { fail, friendlyDebtError, type DebtState } from "../../../../lib/finance/debt-result";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS = ["cash", "transfer", "other"];
const NO = "ليس لديك صلاحية ديون المتجر.";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const money = (f: FormData, k: string) => {
  const t = toDigits(str(f, k)).replace(/[,\s٬]/g, "");
  return t === "" ? 0 : Number(t);
};
const can = async () => (await getMyPermissions()).includes("store_debts");
function refresh() {
  revalidatePath("/admin/debts/store");
  revalidatePath("/admin/debts/payments");
  revalidatePath("/admin/orders");
}

export async function createStoreDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await can())) return fail(NO);
  const direction = str(f, "direction");
  if (direction !== "receivable" && direction !== "payable") return fail("اختر نوع الدين: للمتجر أو على المتجر.");
  const customer = str(f, "customer");
  if (customer && !UUID.test(customer)) return fail("العميل غير صالح.");
  if (customer && direction === "payable") return fail("الديون على المتجر لا تُربط بملف عميل.");
  const party = str(f, "party");
  if (!party && !customer) return fail("اسم الطرف مطلوب، أو اختر عميلًا مسجلًا.");
  if (party.length > 120) return fail("الاسم طويل جدًا.");
  const amount = money(f, "amount");
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1e13) return fail("المبلغ يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
  const debtDate = str(f, "debt_date");
  const due = str(f, "due");
  if (debtDate && !DATE.test(debtDate)) return fail("تاريخ الدين غير صالح.");
  if (due && !DATE.test(due)) return fail("تاريخ الاستحقاق غير صالح.");
  if (due && debtDate && due < debtDate) return fail("تاريخ الاستحقاق يجب ألا يسبق تاريخ الدين.");
  const idem = str(f, "idem");
  if (idem.length < 8 || idem.length > 80) return fail("انتهت صلاحية النموذج، أعد فتحه.");

  let items: { name: string; qty: number; price: number; total: number }[] = [];
  const rawItems = str(f, "items");
  if (rawItems) {
    try {
      const arr = JSON.parse(rawItems);
      if (!Array.isArray(arr) || arr.length > 30) return fail("تفاصيل الأغراض غير صالحة.");
      for (const r of arr) {
        const name = String(r?.name ?? "").trim().slice(0, 120);
        const qty = Number(r?.qty);
        const price = Number(r?.price);
        if (!name || !Number.isInteger(qty) || qty <= 0 || !Number.isInteger(price) || price < 0)
          return fail("تفاصيل الأغراض غير صالحة.");
        items.push({ name, qty, price, total: qty * price });
      }
    } catch {
      return fail("تفاصيل الأغراض غير صالحة.");
    }
    const itemsSum = items.reduce((a, r) => a + r.total, 0);
    if (items.length && itemsSum !== amount) return fail("مجموع الأغراض لا يطابق المبلغ الإجمالي.");
  }

  const s = await createClient();
  const { data, error } = await s.rpc("add_store_debt", {
    p_customer: customer || null,
    p_party: party || null,
    p_amount: amount,
    p_debt_date: debtDate || null,
    p_due: due || null,
    p_order: null,
    p_reason: str(f, "reason").slice(0, 200) || null,
    p_notes: str(f, "notes").slice(0, 1000) || null,
    p_idem: idem,
    p_direction: direction,
  });
  if (error) return friendlyDebtError(error.message);
  if (items.length) {
    const { error: ie } = await s.from("store_debts").update({ items }).eq("id", String(data));
    if (ie) return { ok: true, message: "تم حفظ الدين لكن تعذر حفظ تفاصيل الأغراض.", id: String(data) };
  }
  refresh();
  return { ok: true, message: "تم حفظ الدين", id: String(data) };
}

export async function payStoreDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await can())) return fail(NO);
  const id = str(f, "debt_id");
  if (!UUID.test(id)) return fail("الدين غير صالح.");
  const amount = money(f, "amount");
  if (!Number.isInteger(amount) || amount <= 0) return fail("مبلغ الدفعة يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
  const method = str(f, "method") || "cash";
  if (!METHODS.includes(method)) return fail("طريقة الدفع غير صالحة.");
  const paidAt = str(f, "paid_at");
  if (paidAt && (!DATE.test(paidAt) || paidAt > todayIQ())) return fail("تاريخ الدفعة غير صالح أو في المستقبل.");
  const idem = str(f, "idem");
  if (idem.length < 8 || idem.length > 80) return fail("انتهت صلاحية النموذج، أعد فتحه.");

  const s = await createClient();
  const { error } = await s.rpc("record_debt_payment", {
    p_personal: null,
    p_store: id,
    p_amount: amount,
    p_paid_at: paidAt || null,
    p_method: method,
    p_reference: str(f, "reference").slice(0, 120) || null,
    p_note: str(f, "note").slice(0, 500) || null,
    p_idem: idem,
  });
  if (error) return friendlyDebtError(error.message);
  refresh();
  return { ok: true, message: "تم تسجيل الدفعة" };
}

export async function updateStoreDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await can())) return fail(NO);
  const id = str(f, "id");
  if (!UUID.test(id)) return fail("الدين غير صالح.");
  const due = str(f, "due");
  if (due && !DATE.test(due)) return fail("تاريخ الاستحقاق غير صالح.");
  const s = await createClient();
  const { data: row } = await s.from("store_debts").select("customer_id, order_id, status").eq("id", id).maybeSingle();
  const cur = row as { customer_id: string | null; order_id: string | null; status: string } | null;
  if (!cur || cur.status === "cancelled") return fail("لم يتم التحديث: السجل ملغي أو غير متاح.");
  const patch: Record<string, string | null> = {
    due_date: due || null,
    reason: str(f, "reason").slice(0, 200) || null,
    notes: str(f, "notes").slice(0, 1000) || null,
  };
  const party = str(f, "party");
  if (!cur.customer_id && !cur.order_id && party) {
    if (party.length > 120) return fail("الاسم طويل جدًا.");
    patch.party_name = party;
  }
  const { data, error } = await s.from("store_debts").update(patch).eq("id", id).neq("status", "cancelled").select("id");
  if (error) return friendlyDebtError(error.message);
  if (!data || data.length === 0) return fail("لم يتم التحديث: السجل ملغي أو غير متاح.");
  refresh();
  return { ok: true, message: "تم حفظ التعديلات" };
}

export async function cancelStoreDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await can())) return fail(NO);
  const id = str(f, "id");
  if (!UUID.test(id)) return fail("الدين غير صالح.");
  const s = await createClient();
  const { data, error } = await s
    .from("store_debts")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("paid_amount", 0)
    .eq("status", "open")
    .select("id");
  if (error) return friendlyDebtError(error.message);
  if (!data || data.length === 0)
    return fail("لا يمكن إلغاء الدين: عليه دفعات أو حالته لا تسمح. إن وُجدت دفعات فاعكسها أولًا.");
  refresh();
  return { ok: true, message: "تم إلغاء الدين" };
}
