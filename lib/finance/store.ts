import { createClient } from "../supabase/server";

export const STORE_PAGE_SIZE = 20;

export type StoreFilters = {
  q: string;
  dir: "" | "receivable" | "payable";
  s: "" | "active" | "open" | "partial" | "paid" | "cancelled" | "late";
  src: "" | "order" | "manual";
  page: number;
};

const STATUSES = ["active", "open", "partial", "paid", "cancelled", "late"];

export function parseStoreFilters(sp: { q?: string; dir?: string; s?: string; src?: string; p?: string }): StoreFilters {
  const page = Math.max(1, Math.floor(Number(sp.p)) || 1);
  return {
    q: String(sp.q ?? "").trim().slice(0, 80),
    dir: sp.dir === "receivable" || sp.dir === "payable" ? sp.dir : "",
    s: STATUSES.includes(String(sp.s)) ? (sp.s as StoreFilters["s"]) : "",
    src: sp.src === "order" || sp.src === "manual" ? sp.src : "",
    page: Math.min(page, 10000),
  };
}

type Raw = {
  id: string;
  customer_id: string | null;
  party_name: string;
  direction: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  debt_date: string;
  due_date: string | null;
  reason: string | null;
  status: string;
  order_id: string | null;
  orders: { order_number: string } | { order_number: string }[] | null;
};
export type StoreRow = Omit<Raw, "orders"> & { order_number: string | null };

export type StoreSummary = {
  receivable_remaining: number;
  payable_remaining: number;
  open_count: number;
  overdue_count: number;
  overdue_receivable: number;
  overdue_payable: number;
};

export async function listStoreDebtsPage(f: StoreFilters, today: string) {
  const s = await createClient();
  let q = s
    .from("store_debts")
    .select(
      "id, customer_id, party_name, direction, original_amount, paid_amount, remaining_amount, debt_date, due_date, reason, status, order_id, orders(order_number)",
      { count: "exact" },
    );
  const term = f.q.replace(/[%_,()*\\"']/g, " ").trim();
  if (term) {
    const { data: os } = await s.from("orders").select("id").ilike("order_number", `%${term}%`).limit(50);
    const ids = ((os ?? []) as { id: string }[]).map((o) => o.id);
    let clause = `party_name.ilike.%${term}%,reason.ilike.%${term}%`;
    if (ids.length) clause += `,order_id.in.(${ids.join(",")})`;
    q = q.or(clause);
  }
  if (f.dir) q = q.eq("direction", f.dir);
  if (f.src === "order") q = q.not("order_id", "is", null);
  else if (f.src === "manual") q = q.is("order_id", null);
  if (f.s === "active") q = q.in("status", ["open", "partial"]);
  else if (f.s === "late") q = q.in("status", ["open", "partial"]).lt("due_date", today);
  else if (f.s) q = q.eq("status", f.s);
  const from = (f.page - 1) * STORE_PAGE_SIZE;
  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(from, from + STORE_PAGE_SIZE - 1);
  const rows = ((data ?? []) as unknown as Raw[]).map(({ orders, ...r }) => {
    const o = Array.isArray(orders) ? orders[0] : orders;
    return { ...r, order_number: o?.order_number ?? null } as StoreRow;
  });
  return { rows, total: count ?? 0, error: error ? error.message : null };
}

// null = failed to load (the UI must NOT show it as zero).
export async function getStoreSummary(): Promise<StoreSummary | null> {
  const s = await createClient();
  const { data, error } = await s.rpc("debts_summary", { p_kind: "store" });
  if (error || !data) return null;
  return data as unknown as StoreSummary;
}

export async function listCustomersForPicker() {
  const s = await createClient();
  const { data } = await s.from("customers").select("id, full_name, phone").order("full_name").limit(300);
  return (data ?? []) as unknown as { id: string; full_name: string; phone: string | null }[];
}

export type StoreDetail = {
  id: string;
  customer_id: string | null;
  party_name: string;
  direction: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  debt_date: string;
  due_date: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
  order_id: string | null;
  created_at: string;
  items?: { name: string; qty: number; price: number; total: number }[] | null;
};
export type StorePayment = {
  id: string;
  amount: number;
  paid_at: string;
  method: string;
  reference: string | null;
  note: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
};
export type StoreReceipt = { id: string; receipt_number: string; purpose: string; status: string; debt_payment_id: string | null };

export async function getStoreDebtDetail(id: string) {
  const s = await createClient();
  const { data, error } = await s
    .from("store_debts")
    .select(
      "id, customer_id, party_name, direction, original_amount, paid_amount, remaining_amount, debt_date, due_date, reason, notes, status, order_id, created_at, items",
    )
    .eq("id", id)
    .maybeSingle();
  const empty = { debt: null, payments: [] as StorePayment[], receipts: [] as StoreReceipt[], orderNumber: null as string | null, customer: null as { full_name: string; phone: string | null } | null };
  if (error) return { ...empty, error: error.message };
  if (!data) return { ...empty, error: null };
  const d = data as unknown as StoreDetail;
  const getOrder = async () =>
    d.order_id ? (await s.from("orders").select("order_number").eq("id", d.order_id).maybeSingle()).data : null;
  const getCustomer = async () =>
    d.customer_id ? (await s.from("customers").select("full_name, phone").eq("id", d.customer_id).maybeSingle()).data : null;
  const [pays, recs, ord, cust] = await Promise.all([
    s
      .from("debt_payments")
      .select("id, amount, paid_at, method, reference, note, reversed_at, reversal_reason")
      .eq("store_debt_id", id)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    s.from("receipts").select("id, receipt_number, purpose, status, debt_payment_id").eq("store_debt_id", id),
    getOrder(),
    getCustomer(),
  ]);
  return {
    debt: d,
    payments: (pays.data ?? []) as unknown as StorePayment[],
    receipts: (recs.data ?? []) as unknown as StoreReceipt[],
    orderNumber: ((ord as { order_number: string } | null)?.order_number ?? null) as string | null,
    customer: (cust as { full_name: string; phone: string | null } | null) ?? null,
    error: pays.error?.message ?? null,
  };
}
