"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";
import { getRole } from "../../../../lib/auth/session";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";

export type DebtResult = { ok: boolean; message: string; id?: string; stale?: boolean };
export type DebtState = DebtResult | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^[0-9+\-\s]{6,20}$/;
const METHODS = ["cash", "transfer", "other"];

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const money = (f: FormData, k: string) => {
  const t = toDigits(str(f, k)).replace(/[,\s٬]/g, "");
  return t === "" ? 0 : Number(t);
};
const fail = (message: string, stale?: boolean): DebtResult => ({ ok: false, message, stale });
const isOwner = async () => (await getRole()) === "owner";

function friendly(raw: string): DebtResult {
  const m = raw.toLowerCase();
  if (m.includes("exceeds remaining"))
    return fail("المبلغ أكبر من المتبقي الحالي. تم تحديث الرصيد، راجع المبلغ ثم أعد المحاولة.", true);
  if (m.includes("not allowed") || m.includes("forbidden")) return fail("هذا الإجراء للمالكة فقط.");
  if (m.includes("future")) return fail("تاريخ الدفعة لا يمكن أن يكون في المستقبل.");
  if (m.includes("cancelled")) return fail("الدين ملغي ولا يقبل دفعات.");
  if (m.includes("cannot cancel")) return fail("لا يمكن إلغاء دين عليه دفعات. اعكس الدفعات أولًا من سجل الدفعات.");
  if (m.includes("amount locked")) return fail("لا يمكن تعديل المبلغ بعد وجود دفعات.");
  if (m.includes("invalid payment method")) return fail("طريقة الدفع غير صالحة.");
  if (m.includes('violates check constraint "personal_debts_check"'))
    return fail("تاريخ الاستحقاق يجب ألا يسبق تاريخ الدين.");
  if (m.includes("invalid amount")) return fail("المبلغ غير صالح.");
  return fail("تعذر الحفظ، حاول مرة أخرى.");
}

export async function createDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await isOwner())) return fail("هذه الصفحة للمالكة فقط.");
  const party = str(f, "party");
  if (!party) return fail("اسم الشخص أو الجهة مطلوب.");
  if (party.length > 120) return fail("الاسم طويل جدًا.");
  const direction = str(f, "direction");
  if (direction !== "payable" && direction !== "receivable") return fail("اختر اتجاه الدين: لي أو عليّ.");
  const amount = money(f, "amount");
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1e13) return fail("المبلغ يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
  const paid = money(f, "paid");
  if (!Number.isInteger(paid) || paid < 0) return fail("مبلغ الدفعة الأولية غير صالح.");
  if (paid > amount) return fail("الدفعة الأولية لا يمكن أن تتجاوز مبلغ الدين.");
  const today = todayIQ();
  const debtDate = str(f, "debt_date");
  const due = str(f, "due");
  const paidAt = str(f, "paid_at");
  if (debtDate && !DATE.test(debtDate)) return fail("تاريخ الدين غير صالح.");
  if (due && !DATE.test(due)) return fail("تاريخ الاستحقاق غير صالح.");
  if (due && debtDate && due < debtDate) return fail("تاريخ الاستحقاق يجب ألا يسبق تاريخ الدين.");
  if (paid > 0 && paidAt && (!DATE.test(paidAt) || paidAt > today)) return fail("تاريخ الدفعة الأولية غير صالح أو في المستقبل.");
  const method = str(f, "method") || "cash";
  if (!METHODS.includes(method)) return fail("طريقة الدفع غير صالحة.");
  const phone = toDigits(str(f, "phone"));
  if (phone && !PHONE.test(phone)) return fail("رقم الهاتف غير صالح.");
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
    if (items.length && itemsSum !== amount)
      return fail("مجموع الأغراض لا يطابق المبلغ الإجمالي.");
  }

  const s = await createClient();
  const { data, error } = await s.rpc("add_personal_debt_with_payment", {
    p_party: party,
    p_direction: direction,
    p_amount: amount,
    p_debt_date: debtDate || null,
    p_due: due || null,
    p_reason: str(f, "reason").slice(0, 200) || null,
    p_notes: str(f, "notes").slice(0, 1000) || null,
    p_phone: phone || null,
    p_idem: idem,
    p_paid: paid,
    p_paid_at: paid > 0 ? paidAt || null : null,
    p_method: method,
    p_reference: str(f, "reference").slice(0, 120) || null,
  });
  if (error) return friendly(error.message);
  revalidatePath("/admin/debts/personal");
  if (items.length) {
    const { error: ie } = await s.from("personal_debts").update({ items }).eq("id", String(data));
    if (ie) return { ok: true, message: "تم حفظ الدين لكن تعذر حفظ تفاصيل الأغراض.", id: String(data) };
  }
  return { ok: true, message: "تم حفظ الدين", id: String(data) };
}

export async function payDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await isOwner())) return fail("هذه الصفحة للمالكة فقط.");
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
    p_personal: id,
    p_store: null,
    p_amount: amount,
    p_paid_at: paidAt || null,
    p_method: method,
    p_reference: str(f, "reference").slice(0, 120) || null,
    p_note: str(f, "note").slice(0, 500) || null,
    p_idem: idem,
  });
  if (error) return friendly(error.message);
  revalidatePath("/admin/debts/personal");
  revalidatePath("/admin/debts/payments");
  return { ok: true, message: "تم تسجيل الدفعة" };
}

export async function updateDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await isOwner())) return fail("هذه الصفحة للمالكة فقط.");
  const id = str(f, "id");
  if (!UUID.test(id)) return fail("الدين غير صالح.");
  const party = str(f, "party");
  if (!party || party.length > 120) return fail("اسم الشخص أو الجهة مطلوب.");
  const due = str(f, "due");
  if (due && !DATE.test(due)) return fail("تاريخ الاستحقاق غير صالح.");
  const phone = toDigits(str(f, "phone"));
  if (phone && !PHONE.test(phone)) return fail("رقم الهاتف غير صالح.");
  const s = await createClient();
  const { data, error } = await s
    .from("personal_debts")
    .update({
      party_name: party,
      party_phone: phone || null,
      due_date: due || null,
      reason: str(f, "reason").slice(0, 200) || null,
      notes: str(f, "notes").slice(0, 1000) || null,
    })
    .eq("id", id)
    .neq("status", "cancelled")
    .select("id");
  if (error) return friendly(error.message);
  if (!data || data.length === 0) return fail("لم يتم التحديث: السجل ملغي أو غير متاح.");
  revalidatePath("/admin/debts/personal");
  return { ok: true, message: "تم حفظ التعديلات" };
}

export async function cancelDebtAction(_: DebtState, f: FormData): Promise<DebtState> {
  if (!(await isOwner())) return fail("هذه الصفحة للمالكة فقط.");
  const id = str(f, "id");
  if (!UUID.test(id)) return fail("الدين غير صالح.");
  const s = await createClient();
  const { data, error } = await s
    .from("personal_debts")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("paid_amount", 0)
    .eq("status", "open")
    .select("id");
  if (error) return friendly(error.message);
  if (!data || data.length === 0)
    return fail("لا يمكن إلغاء الدين: عليه دفعات أو حالته لا تسمح. إن وُجدت دفعات فاعكسها أولًا.");
  revalidatePath("/admin/debts/personal");
  return { ok: true, message: "تم إلغاء الدين" };
}
