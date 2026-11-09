"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { addPersonalDebt, recordDebtPayment } from "../../../lib/finance/service";
import type { PayMethod } from "../../../lib/finance/types";

export type ActionState = { ok: boolean; message: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) =>
  Math.round(Number(str(f, k).replace(/[,\s]/g, "")));
const today = () => new Date().toISOString().slice(0, 10);

export async function addPersonalDebtAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  await requireAnyPermission(["personal_debts"]);
  const amount = num(f, "amount");
  if (!str(f, "party")) return { ok: false, message: "اسم الشخص أو الجهة مطلوب" };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, message: "المبلغ يجب أن يكون أكبر من صفر" };
  const r = await addPersonalDebt({
    party: str(f, "party"),
    direction: str(f, "direction") || "payable",
    amount,
    debtDate: str(f, "debt_date") || today(),
    due: str(f, "due") || null,
    reason: str(f, "reason"),
    notes: str(f, "notes"),
    idem: str(f, "idem"),
  });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath("/admin/debts/personal");
  return { ok: true, message: "تم تسجيل الدين" };
}

export async function payPersonalDebtAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  await requireAnyPermission(["personal_debts"]);
  const amount = num(f, "amount");
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, message: "المبلغ يجب أن يكون أكبر من صفر" };
  const r = await recordDebtPayment({
    personal: str(f, "debt_id"),
    amount,
    paidAt: str(f, "paid_at") || today(),
    method: (str(f, "method") || "cash") as PayMethod,
    reference: str(f, "reference"),
    note: str(f, "note"),
    idem: str(f, "idem"),
  });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath("/admin/debts/personal");
  return { ok: true, message: "تم تسجيل الدفعة" };
}
