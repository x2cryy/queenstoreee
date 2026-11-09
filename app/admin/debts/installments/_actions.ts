"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";
import { getRole } from "../../../../lib/auth/session";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";
import { fail, friendlyDebtError, type DebtResult, type DebtState } from "../../../../lib/finance/debt-result";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS = ["cash", "transfer", "other"];
const FREQS = ["weekly", "biweekly", "monthly"];

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const money = (f: FormData, k: string) => {
  const t = toDigits(str(f, k)).replace(/[,\s٬]/g, "");
  return t === "" ? 0 : Number(t);
};

function friendly(raw: string): DebtResult {
  const m = raw.toLowerCase();
  if (m.includes("plan terms are locked")) return fail("شروط الخطة مقفلة بعد الإنشاء.");
  if (m.includes("plan is cancelled")) return fail("الخطة ملغاة ولا تقبل دفعات.");
  if (m.includes("plan is not active")) return fail("الخطة غير نشطة.");
  if (m.includes("installment already paid")) return fail("هذا القسط مسدد بالكامل.");
  if (m.includes("new date cannot be in the past")) return fail("التاريخ الجديد لا يمكن أن يكون في الماضي.");
  if (m.includes("same date")) return fail("التاريخ الجديد مطابق للحالي.");
  if (m.includes("reason required")) return fail("السبب مطلوب (3 أحرف على الأقل).");
  if (m.includes("invalid total or down payment")) return fail("المبلغ الكلي أو الدفعة المقدمة غير صالح. الدفعة المقدمة يجب أن تقل عن الإجمالي.");
  if (m.includes("invalid installments count")) return fail("عدد الأقساط يجب أن يكون بين 1 و360.");
  if (m.includes("amount too small")) return fail("المبلغ صغير جدًا لهذا العدد من الأقساط.");
  if (m.includes("invalid frequency")) return fail("التكرار غير صالح.");
  if (m.includes("title required")) return fail("عنوان الخطة مطلوب.");
  if (m.includes("party required")) return fail("اسم الطرف مطلوب.");
  if (m.includes("personal plans cannot link")) return fail("الخطة الشخصية لا ترتبط بعميل أو طلب.");
  if (m.includes("cannot cancel a plan")) return fail("لا يمكن إلغاء خطة عليها دفعات.");
  if (m.includes("payment exceeds installment")) return fail("المبلغ أكبر من المتبقي على القسط.", true);
  if (m.includes("payment not found")) return fail("الدفعة غير موجودة أو معكوسة مسبقًا.", true);
  return friendlyDebtError(raw);
}

function refresh() {
  revalidatePath("/admin/debts/installments");
  revalidatePath("/admin/debts/installments/[id]", "page");
  revalidatePath("/admin/debts/payments");
}

export async function createPlanAction(_: DebtState, f: FormData): Promise<DebtState> {
  const scope = str(f, "scope");
  if (scope !== "personal" && scope !== "store") return fail("اختر النطاق: شخصي أو متجر.");
  if (scope === "personal") {
    if ((await getRole()) !== "owner") return fail("الخطط الشخصية للمالكة فقط.");
  } else {
    await requireAnyPermission(["installments"]);
  }
  const direction = str(f, "direction");
  if (direction !== "receivable" && direction !== "payable") return fail("اختر اتجاه الاستحقاق.");
  const title = str(f, "title");
  if (!title || title.length > 200) return fail("عنوان الخطة مطلوب (حتى 200 حرف).");
  const customer = scope === "store" ? str(f, "customer") : "";
  if (customer && !UUID.test(customer)) return fail("العميل غير صالح.");
  const party = str(f, "party");
  if (!party && !customer) return fail("اسم الطرف مطلوب (أو اختر عميلًا).");
  if (party.length > 120) return fail("الاسم طويل جدًا.");
  const total = money(f, "total");
  if (!Number.isInteger(total) || total <= 0 || total > 1e13) return fail("المبلغ الكلي يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
  const down = money(f, "down");
  if (!Number.isInteger(down) || down < 0 || down >= total) return fail("الدفعة المقدمة يجب أن تكون أقل من المبلغ الكلي.");
  const count = Number(toDigits(str(f, "count")));
  if (!Number.isInteger(count) || count < 1 || count > 360) return fail("عدد الأقساط يجب أن يكون بين 1 و360.");
  if (Math.floor((total - down) / count) < 1) return fail("المبلغ صغير جدًا لهذا العدد من الأقساط.");
  const freq = str(f, "frequency");
  if (!FREQS.includes(freq)) return fail("التكرار غير صالح.");
  const start = str(f, "start");
  if (!DATE.test(start)) return fail("تاريخ أول استحقاق غير صالح.");
  const method = str(f, "down_method") || "cash";
  if (down > 0 && !METHODS.includes(method)) return fail("طريقة دفع المقدمة غير صالحة.");
  const idem = str(f, "idem");
  if (idem.length < 8 || idem.length > 80) return fail("انتهت صلاحية النموذج، أعد فتحه.");

  const s = await createClient();
  const { data, error } = await s.rpc("create_installment_plan", {
    p_customer: customer || null,
    p_order: null,
    p_party: party || null,
    p_title: title,
    p_total: total,
    p_down: down,
    p_count: count,
    p_start: start,
    p_frequency: freq,
    p_down_method: down > 0 ? method : null,
    p_down_ref: down > 0 ? str(f, "down_ref").slice(0, 120) || null : null,
    p_notes: str(f, "notes").slice(0, 1000) || null,
    p_idem: idem,
    p_scope: scope,
    p_direction: direction,
  });
  if (error) return friendly(error.message);
  refresh();
  return { ok: true, message: "تم إنشاء الخطة", id: String(data) };
}

export async function payInstallmentAction(_: DebtState, f: FormData): Promise<DebtState> {
  await requireAnyPermission(["installments"]);
  const plan = str(f, "plan_id");
  if (!UUID.test(plan)) return fail("الخطة غير صالحة.");
  const schedule = str(f, "schedule_id");
  if (schedule && !UUID.test(schedule)) return fail("القسط غير صالح.");
  const amount = money(f, "amount");
  if (!Number.isInteger(amount) || amount <= 0) return fail("مبلغ الدفعة يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
  const method = str(f, "method") || "cash";
  if (!METHODS.includes(method)) return fail("طريقة الدفع غير صالحة.");
  const paidAt = str(f, "paid_at");
  if (paidAt && (!DATE.test(paidAt) || paidAt > todayIQ())) return fail("تاريخ الدفعة غير صالح أو في المستقبل.");
  const idem = str(f, "idem");
  if (idem.length < 8 || idem.length > 80) return fail("انتهت صلاحية النموذج، أعد فتحه.");

  const s = await createClient();
  const { data, error } = await s.rpc("record_installment_payment", {
    p_installment: plan,
    p_schedule: schedule || null,
    p_amount: amount,
    p_paid_at: paidAt || null,
    p_method: method,
    p_reference: str(f, "reference").slice(0, 120) || null,
    p_note: str(f, "note").slice(0, 500) || null,
    p_idem: idem,
  });
  if (error) return friendly(error.message);
  refresh();
  return { ok: true, message: "تم تسجيل الدفعة", id: String(data) };
}

export async function reverseInstallmentPaymentAction(_: DebtState, f: FormData): Promise<DebtState> {
  await requireAnyPermission(["installments"]);
  const id = str(f, "payment_id");
  if (!UUID.test(id)) return fail("الدفعة غير صالحة.");
  const reason = str(f, "reason");
  if (reason.length < 3 || reason.length > 300) return fail("سبب العكس مطلوب (3 أحرف على الأقل).");
  const s = await createClient();
  const { error } = await s.rpc("reverse_payment", { p_kind: "installment", p_payment: id, p_reason: reason });
  if (error) return friendly(error.message);
  refresh();
  return { ok: true, message: "تم عكس الدفعة" };
}

export async function rescheduleAction(_: DebtState, f: FormData): Promise<DebtState> {
  await requireAnyPermission(["installments"]);
  const id = str(f, "schedule_id");
  if (!UUID.test(id)) return fail("القسط غير صالح.");
  const due = str(f, "new_due");
  if (!DATE.test(due) || due < todayIQ()) return fail("التاريخ الجديد غير صالح أو في الماضي.");
  const reason = str(f, "reason");
  if (reason.length < 3 || reason.length > 300) return fail("السبب مطلوب (3 أحرف على الأقل).");
  const s = await createClient();
  const { error } = await s.rpc("reschedule_installment", { p_schedule: id, p_new_due: due, p_reason: reason });
  if (error) return friendly(error.message);
  refresh();
  return { ok: true, message: "تم تأجيل القسط" };
}

export async function cancelPlanAction(_: DebtState, f: FormData): Promise<DebtState> {
  await requireAnyPermission(["installments"]);
  const id = str(f, "id");
  if (!UUID.test(id)) return fail("الخطة غير صالحة.");
  const s = await createClient();
  const { data, error } = await s
    .from("installments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "active")
    .eq("paid_amount", 0)
    .eq("down_payment", 0)
    .select("id");
  if (error) return friendly(error.message);
  if (!data || data.length === 0)
    return fail("لا يمكن إلغاء الخطة: عليها دفعات أو دفعة مقدمة أو حالتها لا تسمح.");
  refresh();
  return { ok: true, message: "تم إلغاء الخطة" };
}
