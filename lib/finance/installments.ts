import { createClient } from "../supabase/server";

export const INST_PAGE_SIZE = 20;

export const SCOPE_LABEL: Record<string, string> = { personal: "شخصي", store: "متجر" };
export const INST_STATUS_LABEL: Record<string, string> = {
  active: "نشطة",
  completed: "مكتملة",
  cancelled: "ملغاة",
  late: "متأخرة",
};

export type InstFilters = {
  q: string;
  scope: "" | "personal" | "store";
  dir: "" | "receivable" | "payable";
  s: "" | "active" | "completed" | "cancelled" | "late";
  page: number;
};

export type InstRow = {
  id: string;
  party_name: string;
  title: string;
  scope: string;
  direction: string;
  total_amount: number;
  down_payment: number;
  paid_amount: number;
  remaining_amount: number;
  gross_total: number;
  status: string;
  start_date: string;
  frequency: string;
  installments_count: number;
  next_due: string | null;
  next_amount: number | null;
};

export type InstSummary = {
  active_plans: number;
  remaining_receivable: number;
  remaining_payable: number;
  due_receivable: number;
  due_payable: number;
  overdue_receivable: number;
  overdue_payable: number;
  overdue_count: number;
};

const STATUSES = ["active", "completed", "cancelled", "late"];
const COLS =
  "id, party_name, title, scope, direction, total_amount, down_payment, paid_amount, remaining_amount, gross_total, status, start_date, frequency, installments_count";

export function parseInstFilters(sp: { q?: string; scope?: string; dir?: string; s?: string; p?: string }): InstFilters {
  const page = Math.max(1, Math.floor(Number(sp.p)) || 1);
  return {
    q: String(sp.q ?? "").trim().slice(0, 80),
    scope: sp.scope === "personal" || sp.scope === "store" ? sp.scope : "",
    dir: sp.dir === "receivable" || sp.dir === "payable" ? sp.dir : "",
    s: STATUSES.includes(String(sp.s)) ? (sp.s as InstFilters["s"]) : "",
    page: Math.min(page, 10000),
  };
}

export async function listInstallmentsPage(
  f: InstFilters,
): Promise<{ rows: InstRow[]; total: number; error: string | null }> {
  const s = await createClient();
  let q = s.from("installments").select(COLS, { count: "exact" });

  if (f.s === "late") {
    const { data: late, error: le } = await s.rpc("installments_late_ids");
    if (le) return { rows: [], total: 0, error: le.message };
    const ids = ((late ?? []) as { installment_id: string }[]).map((r) => r.installment_id).slice(0, 400);
    if (ids.length === 0) return { rows: [], total: 0, error: null };
    q = q.in("id", ids);
  } else if (f.s) {
    q = q.eq("status", f.s);
  }

  const term = f.q.replace(/[%_,()*\\"']/g, " ").trim();
  if (term) q = q.or(`party_name.ilike.%${term}%,title.ilike.%${term}%`);
  if (f.scope) q = q.eq("scope", f.scope);
  if (f.dir) q = q.eq("direction", f.dir);

  const from = (f.page - 1) * INST_PAGE_SIZE;
  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(from, from + INST_PAGE_SIZE - 1);
  if (error) return { rows: [], total: 0, error: error.message };

  const base = (data ?? []) as unknown as Omit<InstRow, "next_due" | "next_amount">[];
  const next = new Map<string, { due: string; rem: number }>();
  if (base.length > 0) {
    const { data: nx } = await s.rpc("installments_next_due", { p_ids: base.map((r) => r.id) });
    for (const r of (nx ?? []) as { installment_id: string; due_date: string; remaining: number }[]) {
      next.set(r.installment_id, { due: r.due_date, rem: Number(r.remaining) });
    }
  }
  const rows = base.map((r) => {
    const n = r.status === "active" ? next.get(r.id) : undefined;
    return { ...r, next_due: n?.due ?? null, next_amount: n?.rem ?? null };
  });
  return { rows, total: count ?? 0, error: null };
}

// null = failed to load (the UI must NOT show it as zero).
export async function getInstSummary(scope: "" | "personal" | "store"): Promise<InstSummary | null> {
  const s = await createClient();
  const { data, error } = await s.rpc("debts_summary", {
    p_kind: "installments",
    p_days: 30,
    p_scope: scope || null,
  });
  if (error || !data) return null;
  return data as unknown as InstSummary;
}

export type ScheduleRow = {
  id: string;
  seq: number;
  due_date: string;
  original_due_date: string | null;
  amount_due: number;
  amount_paid: number;
};
export type InstPayment = {
  id: string;
  schedule_id: string;
  amount: number;
  paid_at: string;
  method: string;
  reference: string | null;
  note: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  installment_schedule: { seq: number } | null;
};
export type InstReceipt = {
  id: string;
  receipt_number: string;
  purpose: string;
  status: string;
  amount: number | null;
  paid_on: string | null;
};
export type InstReschedule = {
  id: string;
  schedule_id: string;
  old_due_date: string;
  new_due_date: string;
  reason: string | null;
  created_at: string;
};
export type InstDetail = InstRow & {
  notes: string | null;
  customer_id: string | null;
  order_id: string | null;
  down_payment_method: string | null;
  down_payment_ref: string | null;
  orders: { order_number: string } | null;
};

export async function getInstallmentDetail(id: string) {
  const s = await createClient();
  const empty = { plan: null, schedule: [], payments: [], receipts: [], reschedules: [] };
  const { data: plan, error } = await s
    .from("installments")
    .select(COLS + ", notes, customer_id, order_id, down_payment_method, down_payment_ref, orders(order_number)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ...empty, error: error.message };
  if (!plan) return { ...empty, error: null };

  const [sch, pays, recs, resch] = await Promise.all([
    s
      .from("installment_schedule")
      .select("id, seq, due_date, original_due_date, amount_due, amount_paid")
      .eq("installment_id", id)
      .order("seq")
      .limit(400),
    s
      .from("installment_payments")
      .select(
        "id, schedule_id, amount, paid_at, method, reference, note, reversed_at, reversal_reason, installment_schedule!inner(seq, installment_id)",
      )
      .eq("installment_schedule.installment_id", id)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
    s
      .from("receipts")
      .select("id, receipt_number, purpose, status, amount, paid_on")
      .eq("installment_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    s
      .from("installment_reschedules")
      .select("id, schedule_id, old_due_date, new_due_date, reason, created_at")
      .eq("installment_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return {
    plan: plan as unknown as InstDetail,
    schedule: (sch.data ?? []) as unknown as ScheduleRow[],
    payments: (pays.data ?? []) as unknown as InstPayment[],
    receipts: (recs.data ?? []) as unknown as InstReceipt[],
    reschedules: (resch.data ?? []) as unknown as InstReschedule[],
    error: sch.error?.message ?? pays.error?.message ?? null,
  };
}
