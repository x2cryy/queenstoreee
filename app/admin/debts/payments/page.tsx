import { redirect } from "next/navigation";
import { getMyPermissions, requireAnyPermission } from "../../../../lib/admin/access";
import { listPayments } from "../../../../lib/finance/payments";
import { iqd } from "../../../../lib/finance/types";
import { ReverseForm } from "./ReverseForm";

const METHOD: Record<string, string> = { cash: "نقداً", transfer: "تحويل", qi_card: "Qi Card", other: "أخرى" };

export default async function Page({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  await requireAnyPermission(["store_debts", "personal_debts", "installments"]);
  const { k = "" } = await searchParams;
  const myPerms = await getMyPermissions();
  if (k !== "personal" && k !== "store" && myPerms.includes("installments")) {
    redirect("/admin/debts/installments?tab=payments");
  }
  const all = await listPayments();
  const rows = k ? all.filter((p) => p.kind === k) : all;
  const live = rows.filter((p) => !p.reversed_at);
  return (
    <section>
      <h1 className="qs-h1">سجل الدفعات</h1>
      <p className="qs-muted">الدفعات المؤكدة لا تُحذف. تُصحَّح بالعكس الموثق فقط.</p>
      <form className="qa-form" method="get">
        <select className="qa-input" name="k" defaultValue={k}>
          <option value="">كل الأنواع</option>
          <option value="personal">ديون شخصية</option>
          <option value="store">ديون المتجر</option>
          <option value="installment">أقساط</option>
        </select>
        <button className="qa-btn">تطبيق</button>
      </form>
      {k && <div className="qa-card"><div className="qa-row"><span>مجموع الدفعات السارية</span><b>{iqd(live.reduce((a, p) => a + p.amount, 0))}</b></div></div>}
      {rows.length === 0 && <div className="qa-note">لا توجد دفعات.</div>}
      {rows.map((p) => (
        <div className="qa-card" key={p.kind + p.id}>
          <div className="qa-row">
            <div><b>{p.party}</b><div className="qs-muted">{p.label} · {p.paid_at}</div></div>
            <b style={p.reversed_at ? { textDecoration: "line-through" } : undefined}>{iqd(p.amount)}</b>
          </div>
          <div className="qs-muted">{METHOD[p.method] ?? p.method}{p.reference ? " · " + p.reference : ""}</div>
          {p.reversed_at
            ? <div className="qa-note qa-err">معكوسة: {p.reversal_reason}</div>
            : <ReverseForm kind={p.kind} id={p.id} />}
        </div>
      ))}
    </section>
  );
}
