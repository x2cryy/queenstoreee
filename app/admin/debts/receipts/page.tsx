import { requireAnyPermission } from "../../../../lib/admin/access";
import { listReceipts } from "../../../../lib/finance/receipts";
import { iqd } from "../../../../lib/finance/types";

export default async function Page() {
  await requireAnyPermission(["store_debts", "personal_debts", "installments"]);
  const { rows, error } = await listReceipts();
  return (
    <section>
      <h1 className="qs-h1">الوصول</h1>
      {error && <div className="qa-note qa-err">تعذر تحميل الوصول</div>}
      {rows.length === 0 && <div className="qa-note">لا توجد وصول.</div>}
      {rows.map((r) => (
        <a key={r.id} className="qa-card qa-link" href={"/print/receipt/" + r.id} target="_blank" rel="noopener noreferrer">
          <div className="qa-row">
            <b>{r.receipt_number}</b>
            <b>{iqd(r.amount ?? r.total_amount)}</b>
          </div>
          <span>{r.party_name} · {(r.paid_on ?? r.created_at).slice(0, 10)}</span>
        </a>
      ))}
    </section>
  );
}
