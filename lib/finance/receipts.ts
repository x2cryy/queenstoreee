import { getMyPermissions } from "../admin/access";
import { createClient } from "../supabase/server";

const COLS = "id, receipt_number, receipt_type, purpose, party_name, store_debt_id, personal_debt_id, installment_id, order_id, total_amount, remaining_amount, amount, method, reference, paid_on, status, notes, created_at";

type Ids = { personal_debt_id: string | null; store_debt_id: string | null; installment_id: string | null };

function allowed(perms: string[], r: Ids) {
  if (!r.personal_debt_id && !r.store_debt_id && !r.installment_id) return false;
  if (r.personal_debt_id && !perms.includes("personal_debts")) return false;
  if (r.store_debt_id && !perms.includes("store_debts")) return false;
  if (r.installment_id && !perms.includes("installments")) return false;
  return true;
}

export async function listReceipts() {
  const perms = await getMyPermissions();
  const s = await createClient();
  const { data, error } = await s.from("receipts").select(COLS).order("created_at", { ascending: false }).limit(200);
  return { rows: (data ?? []).filter((r) => allowed(perms, r)), error: error?.message ?? null };
}

export async function getReceipt(id: string) {
  const perms = await getMyPermissions();
  const s = await createClient();
  const { data } = await s.from("receipts").select(COLS).eq("id", id).maybeSingle();
  return data && allowed(perms, data) ? data : null;
}
