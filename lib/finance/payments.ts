import { getMyPermissions } from "../admin/access";
import { createClient } from "../supabase/server";

export type Pay = {
  kind: "personal" | "store" | "installment";
  id: string; party: string; label: string; amount: number;
  paid_at: string; method: string; reference: string | null;
  reversed_at: string | null; reversal_reason: string | null; created_at: string;
};

const uniq = (a: (string | null)[]) => [...new Set(a.filter((x): x is string => !!x))];

export async function listPayments(): Promise<Pay[]> {
  const perms = await getMyPermissions();
  const s = await createClient();
  const out: Pay[] = [];

  const dp = await s.from("debt_payments")
    .select("id, personal_debt_id, store_debt_id, amount, paid_at, method, reference, reversed_at, reversal_reason, created_at")
    .order("created_at", { ascending: false }).limit(300);
  const rows = dp.data ?? [];
  const pIds = uniq(rows.map((r) => r.personal_debt_id));
  const sIds = uniq(rows.map((r) => r.store_debt_id));
  const pNames = new Map<string, string>();
  const sNames = new Map<string, string>();
  if (pIds.length && perms.includes("personal_debts")) {
    const { data } = await s.from("personal_debts").select("id, party_name").in("id", pIds);
    (data ?? []).forEach((d) => pNames.set(d.id, d.party_name));
  }
  if (sIds.length && perms.includes("store_debts")) {
    const { data } = await s.from("store_debts").select("id, party_name").in("id", sIds);
    (data ?? []).forEach((d) => sNames.set(d.id, d.party_name));
  }
  for (const r of rows) {
    const personal = !!r.personal_debt_id;
    if (personal && !perms.includes("personal_debts")) continue;
    if (!personal && !perms.includes("store_debts")) continue;
    out.push({
      kind: personal ? "personal" : "store", id: r.id,
      party: (personal ? pNames.get(r.personal_debt_id) : sNames.get(r.store_debt_id)) ?? "-",
      label: personal ? "دين شخصي" : "دين متجر",
      amount: Number(r.amount), paid_at: r.paid_at, method: r.method,
      reference: r.reference, reversed_at: r.reversed_at,
      reversal_reason: r.reversal_reason, created_at: r.created_at,
    });
  }

  if (perms.includes("installments")) {
    const ip = await s.from("installment_payments")
      .select("id, schedule_id, amount, paid_at, method, reference, reversed_at, reversal_reason, created_at")
      .order("created_at", { ascending: false }).limit(300);
    const irows = ip.data ?? [];
    const sch = irows.length
      ? await s.from("installment_schedule").select("id, installment_id, seq").in("id", uniq(irows.map((r) => r.schedule_id)))
      : { data: [] };
    const plans = (sch.data ?? []).length
      ? await s.from("installments").select("id, title, party_name").in("id", uniq((sch.data ?? []).map((x) => x.installment_id)))
      : { data: [] };
    const sMap = new Map((sch.data ?? []).map((x) => [x.id, x]));
    const pMap = new Map((plans.data ?? []).map((x) => [x.id, x]));
    for (const r of irows) {
      const sc = sMap.get(r.schedule_id);
      const pl = sc ? pMap.get(sc.installment_id) : null;
      out.push({
        kind: "installment", id: r.id, party: pl?.party_name ?? "-",
        label: "قسط" + (sc ? " " + sc.seq : "") + (pl ? " - " + pl.title : ""),
        amount: Number(r.amount), paid_at: r.paid_at, method: r.method,
        reference: r.reference, reversed_at: r.reversed_at,
        reversal_reason: r.reversal_reason, created_at: r.created_at,
      });
    }
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
