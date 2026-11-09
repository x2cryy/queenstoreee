import { createClient } from "../supabase/server";

export async function listPersonalDebts() {
  const s = await createClient();
  const { data, error } = await s
    .from("personal_debts")
    .select("id, party_name, direction, original_amount, paid_amount, remaining_amount, debt_date, due_date, reason, notes, status")
    .order("created_at", { ascending: false });
  return { rows: data ?? [], error: error?.message ?? null };
}

export async function listStoreDebts() {
  const s = await createClient();
  const { data, error } = await s
    .from("store_debts")
    .select("id, customer_id, party_name, original_amount, paid_amount, remaining_amount, debt_date, due_date, order_id, reason, notes, status")
    .order("created_at", { ascending: false });
  return { rows: data ?? [], error: error?.message ?? null };
}

export async function listInstallments() {
  const s = await createClient();
  const { data, error } = await s
    .from("installments")
    .select("id, party_name, title, total_amount, down_payment, installments_count, start_date, frequency, paid_amount, remaining_amount, status, customer_id, order_id")
    .order("created_at", { ascending: false });
  return { rows: data ?? [], error: error?.message ?? null };
}

export async function getPersonalDebt(id: string) {
  const s = await createClient();
  const { data: debt } = await s.from("personal_debts").select("*").eq("id", id).maybeSingle();
  const { data: pays } = await s
    .from("debt_payments")
    .select("id, amount, paid_at, method, reference, note, reversed_at, reversal_reason, created_at")
    .eq("personal_debt_id", id)
    .order("paid_at", { ascending: false });
  return { debt, pays: pays ?? [] };
}

export async function getStoreDebt(id: string) {
  const s = await createClient();
  const { data: debt } = await s.from("store_debts").select("*").eq("id", id).maybeSingle();
  const { data: pays } = await s
    .from("debt_payments")
    .select("id, amount, paid_at, method, reference, note, reversed_at, reversal_reason, created_at")
    .eq("store_debt_id", id)
    .order("paid_at", { ascending: false });
  return { debt, pays: pays ?? [] };
}

export async function getInstallment(id: string) {
  const s = await createClient();
  const { data: plan } = await s.from("installments").select("*").eq("id", id).maybeSingle();
  const { data: schedule } = await s
    .from("installment_schedule")
    .select("id, seq, due_date, amount_due, amount_paid, original_due_date")
    .eq("installment_id", id)
    .order("seq");
  const ids = (schedule ?? []).map((r) => r.id);
  const { data: pays } = ids.length
    ? await s
        .from("installment_payments")
        .select("id, schedule_id, amount, paid_at, method, reference, note, reversed_at, reversal_reason")
        .in("schedule_id", ids)
        .order("paid_at", { ascending: false })
    : { data: [] };
  return { plan, schedule: schedule ?? [], pays: pays ?? [] };
}
