export type DebtResult = { ok: boolean; message: string; id?: string; stale?: boolean };
export type DebtState = DebtResult | null;

export const fail = (message: string, stale?: boolean): DebtResult => ({ ok: false, message, stale });

export function friendlyDebtError(raw: string): DebtResult {
  const m = raw.toLowerCase();
  if (m.includes("exceeds remaining"))
    return fail("المبلغ أكبر من المتبقي الحالي. حدّث الرصيد ثم أعد المحاولة.", true);
  if (m.includes("exceeds the order")) return fail("المبلغ أكبر من المتبقي على الطلب.");
  if (m.includes("order debts must be receivable")) return fail("دين الطلب يجب أن يكون مستحقًا للمتجر.");
  if (m.includes("order belongs to another customer")) return fail("الطلب يخص عميلًا آخر.");
  if (m.includes("not allowed") || m.includes("forbidden")) return fail("ليس لديك صلاحية لهذا الإجراء.");
  if (m.includes("future")) return fail("تاريخ الدفعة لا يمكن أن يكون في المستقبل.");
  if (m.includes("cancelled")) return fail("الدين ملغي ولا يقبل دفعات.");
  if (m.includes("cannot cancel")) return fail("لا يمكن إلغاء دين عليه دفعات. اعكس الدفعات أولًا.");
  if (m.includes("amount locked")) return fail("لا يمكن تعديل المبلغ بعد وجود دفعات.");
  if (m.includes("invalid payment method")) return fail("طريقة الدفع غير صالحة.");
  if (m.includes("store_debts_customer_id_fkey")) return fail("العميل المختار غير موجود.");
  if (m.includes("store_debts_order_active_uq")) return fail("هذا الطلب محفوظ كدين بالفعل.");
  if (m.includes('check constraint "store_debts_check"') || m.includes('check constraint "personal_debts_check"'))
    return fail("تاريخ الاستحقاق يجب ألا يسبق تاريخ الدين.");
  if (m.includes("invalid amount")) return fail("المبلغ غير صالح.");
  return fail("تعذر الحفظ، حاول مرة أخرى.");
}
