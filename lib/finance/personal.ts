import { createClient } from "../supabase/server";

export const PAGE_SIZE = 20;

export type PersonalFilters = {
  q: string;
  dir: "" | "receivable" | "payable";
  s: "" | "active" | "open" | "partial" | "paid" | "cancelled" | "late";
  page: number;
};

export type PersonalRow = {
  id: string;
  party_name: string;
  direction: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  debt_date: string;
  due_date: string | null;
  reason: string | null;
  status: string;
};

export type PersonalSummary = {
  receivable_remaining: number;
  payable_remaining: number;
  open_count: number;
  overdue_count: number;
  overdue_receivable: number;
  overdue_payable: number;
};

const STATUSES = ["active", "open", "partial", "paid", "cancelled", "late"];

export function parseFilters(sp: { q?: string; dir?: string; s?: string; p?: string }): PersonalFilters {
  const page = Math.max(1, Math.floor(Number(sp.p)) || 1);
  return {
    q: String(sp.q ?? "").trim().slice(0, 80),
    dir: sp.dir === "receivable" || sp.dir === "payable" ? sp.dir : "",
    s: STATUSES.includes(String(sp.s)) ? (sp.s as PersonalFilters["s"]) : "",
    page: Math.min(page, 10000),
  };
}

export async function listPersonalDebtsPage(f: PersonalFilters, today: string) {
  const s = await createClient();
  let q = s
    .from("personal_debts")
    .select(
      "id, party_name, direction, original_amount, paid_amount, remaining_amount, debt_date, due_date, reason, status",
      { count: "exact" },
    );
  const term = f.q.replace(/[%_,()*\\"']/g, " ").trim();
  if (term) q = q.or(`party_name.ilike.%${term}%,reason.ilike.%${term}%`);
  if (f.dir) q = q.eq("direction", f.dir);
  if (f.s === "active") q = q.in("status", ["open", "partial"]);
  else if (f.s === "late") q = q.in("status", ["open", "partial"]).lt("due_date", today);
  else if (f.s) q = q.eq("status", f.s);
  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  return {
    rows: (data ?? []) as unknown as PersonalRow[],
    total: count ?? 0,
    error: error ? error.message : null,
  };
}

// null = failed to load (the UI must NOT show it as zero).
export async function getPersonalSummary(): Promise<PersonalSummary | null> {
  const s = await createClient();
  const { data, error } = await s.rpc("debts_summary", { p_kind: "personal" });
  if (error || !data) return null;
  return data as unknown as PersonalSummary;
}

export type PersonalDetail = PersonalRow & { party_phone: string | null; notes: string | null; created_at: string; items: { name: string; qty: number; price: number; total: number }[] | null };
export type PersonalPayment = {
  id: string;
  amount: number;
  paid_at: string;
  method: string;
  reference: string | null;
  note: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
};
export type PersonalReceipt = {
  id: string;
  receipt_number: string;
  purpose: string;
  status: string;
  debt_payment_id: string | null;
};

export async function getPersonalDebtDetail(id: string) {
  const s = await createClient();
  const { data: debt, error } = await s
    .from("personal_debts")
    .select(
      "id, party_name, party_phone, direction, original_amount, paid_amount, remaining_amount, debt_date, due_date, reason, notes, status, created_at, items",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return { debt: null, payments: [], receipts: [], error: error.message };
  if (!debt) return { debt: null, payments: [], receipts: [], error: null };
  const [pays, recs] = await Promise.all([
    s
      .from("debt_payments")
      .select("id, amount, paid_at, method, reference, note, reversed_at, reversal_reason")
      .eq("personal_debt_id", id)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    s
      .from("receipts")
      .select("id, receipt_number, purpose, status, debt_payment_id")
      .eq("personal_debt_id", id),
  ]);
  return {
    debt: debt as unknown as PersonalDetail,
    payments: (pays.data ?? []) as unknown as PersonalPayment[],
    receipts: (recs.data ?? []) as unknown as PersonalReceipt[],
    error: pays.error?.message ?? null,
  };
}
