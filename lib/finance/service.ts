import { createClient } from "../supabase/server";
import { finError } from "./errors";
import type { FinResult, PayMethod } from "./types";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<FinResult<T>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, error: finError(error) };
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: finError(e) };
  }
}

export const addPersonalDebt = (a: {
  party: string; direction: string; amount: number; debtDate: string;
  due?: string | null; reason?: string; notes?: string; idem: string;
}) =>
  rpc("add_personal_debt", {
    p_party: a.party, p_direction: a.direction, p_amount: a.amount,
    p_debt_date: a.debtDate, p_due: a.due ?? null,
    p_reason: a.reason ?? null, p_notes: a.notes ?? null, p_idem: a.idem,
  });

export const addStoreDebt = (a: {
  customer: string; party?: string; amount: number; debtDate: string;
  due?: string | null; order?: string | null; reason?: string;
  notes?: string; idem: string;
}) =>
  rpc("add_store_debt", {
    p_customer: a.customer, p_party: a.party ?? null, p_amount: a.amount,
    p_debt_date: a.debtDate, p_due: a.due ?? null, p_order: a.order ?? null,
    p_reason: a.reason ?? null, p_notes: a.notes ?? null, p_idem: a.idem,
  });

export const recordDebtPayment = (a: {
  personal?: string | null; store?: string | null; amount: number;
  paidAt: string; method: PayMethod; reference?: string; note?: string; idem: string;
}) =>
  rpc("record_debt_payment", {
    p_personal: a.personal ?? null, p_store: a.store ?? null,
    p_amount: a.amount, p_paid_at: a.paidAt, p_method: a.method,
    p_reference: a.reference ?? null, p_note: a.note ?? null, p_idem: a.idem,
  });

export const createInstallmentPlan = (a: {
  customer: string; order?: string | null; party?: string; title: string;
  total: number; down: number; count: number; start: string;
  frequency: string; downMethod?: PayMethod; downRef?: string;
  notes?: string; idem: string;
}) =>
  rpc("create_installment_plan", {
    p_customer: a.customer, p_order: a.order ?? null, p_party: a.party ?? null,
    p_title: a.title, p_total: a.total, p_down: a.down, p_count: a.count,
    p_start: a.start, p_frequency: a.frequency,
    p_down_method: a.downMethod ?? null, p_down_ref: a.downRef ?? null,
    p_notes: a.notes ?? null, p_idem: a.idem,
  });

export const recordInstallmentPayment = (a: {
  installment: string; schedule?: string | null; amount: number;
  paidAt: string; method: PayMethod; reference?: string; note?: string; idem: string;
}) =>
  rpc("record_installment_payment", {
    p_installment: a.installment, p_schedule: a.schedule ?? null,
    p_amount: a.amount, p_paid_at: a.paidAt, p_method: a.method,
    p_reference: a.reference ?? null, p_note: a.note ?? null, p_idem: a.idem,
  });

export const reschedulePlan = (a: { schedule: string; newDue: string; reason: string }) =>
  rpc("reschedule_installment", {
    p_schedule: a.schedule, p_new_due: a.newDue, p_reason: a.reason,
  });

export const reversePayment = (a: { kind: string; payment: string; reason: string }) =>
  rpc("reverse_payment", { p_kind: a.kind, p_payment: a.payment, p_reason: a.reason });

export const syncAlerts = () => rpc("finance_alerts_sync", {});
export const myFinance = () => rpc("my_finance", {});
export const getMyReceipt = (id: string) => rpc("get_my_receipt", { p_id: id });
