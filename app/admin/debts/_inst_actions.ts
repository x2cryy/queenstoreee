"use server";
import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { createInstallmentPlan, recordInstallmentPayment, reschedulePlan } from "../../../lib/finance/service";
import type { PayMethod } from "../../../lib/finance/types";
import type { ActionState } from "./_actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Math.round(Number(str(f, k).replace(/[,\s]/g, "")));
const today = () => new Date().toISOString().slice(0, 10);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const P = "/admin/debts/installments";

export async function createPlanAction(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAnyPermission(["installments"]);
  const customer = str(f, "customer");
  const order = str(f, "order");
  const total = num(f, "total");
  const down = num(f, "down") || 0;
  const count = num(f, "count");
  if (!UUID.test(customer)) return { ok: false, message: "اختر الزبون" };
  if (order && !UUID.test(order)) return { ok: false, message: "رقم الطلب غير صحيح" };
  if (!(total > 0)) return { ok: false, message: "المبلغ الإجمالي يجب أن يكون أكبر من صفر" };
  if (down < 0 || down >= total) return { ok: false, message: "الدفعة المقدمة يجب أن تكون أقل من الإجمالي" };
  if (!Number.isInteger(count) || count < 1 || count > 60) return { ok: false, message: "عدد الأقساط من 1 إلى 60" };
  const s = await createClient();
  const { data: c } = await s.from("customers").select("full_name").eq("id", customer).maybeSingle();
  const r = await createInstallmentPlan({
    customer, order: order || null, party: c?.full_name ?? undefined,
    title: str(f, "title") || "خطة أقساط", total, down, count,
    start: str(f, "start") || today(), frequency: str(f, "frequency") || "monthly",
    downMethod: down > 0 ? ((str(f, "down_method") || "cash") as PayMethod) : undefined,
    downRef: str(f, "down_ref"), notes: str(f, "notes"), idem: str(f, "idem"),
  });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath(P);
  return { ok: true, message: "تم إنشاء الخطة" };
}

export async function payInstAction(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAnyPermission(["installments"]);
  const amount = num(f, "amount");
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "المبلغ يجب أن يكون أكبر من صفر" };
  const r = await recordInstallmentPayment({
    installment: str(f, "plan_id"), schedule: str(f, "schedule") || null, amount,
    paidAt: str(f, "paid_at") || today(), method: (str(f, "method") || "cash") as PayMethod,
    reference: str(f, "reference"), note: str(f, "note"), idem: str(f, "idem"),
  });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath(P);
  return { ok: true, message: "تم تسجيل الدفعة" };
}

export async function rescheduleAction(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAnyPermission(["installments"]);
  const schedule = str(f, "schedule");
  const newDue = str(f, "new_due");
  const reason = str(f, "reason");
  if (!UUID.test(schedule) || !newDue) return { ok: false, message: "اختر القسط والتاريخ الجديد" };
  if (!reason) return { ok: false, message: "سبب إعادة الجدولة مطلوب" };
  const r = await reschedulePlan({ schedule, newDue, reason });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath(P);
  return { ok: true, message: "تمت إعادة الجدولة" };
}
