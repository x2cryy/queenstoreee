/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { requireAnyPermission } from "../../../../../lib/admin/access";
import { getPersonalDebtDetail } from "../../../../../lib/finance/personal";
import { getStoreDebtDetail } from "../../../../../lib/finance/store";
import { iqd } from "../../../../../lib/finance/types";
import { PrintBar } from "../../../receipt/[id]/PrintBar";

type Row = Record<string, any>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHOD: Record<string, string> = { cash: "نقدي", transfer: "تحويل", other: "أخرى" };
const day = (v: unknown) => (v ? String(v).slice(0, 10) : "-");

const CSS = `
.rc{max-width:640px;margin:0 auto;padding:18px;background:#FBF7EF;color:#17140F}
.rc-box{background:#fff;border:3px double #B89B6A;border-radius:14px;padding:0 0 20px;overflow:hidden}
.rc-head{background:#17140F;color:#E9DFC9;text-align:center;padding:18px 12px;border-bottom:4px solid #B89B6A}
.rc-head h1{margin:0;font-size:1.6rem;letter-spacing:.08em;display:inline-flex;align-items:center;gap:8px}
.rc-head p{margin:6px 0 0}
.rc-in{padding:14px 20px}
.rc-r{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee}
.rc-t{width:100%;border-collapse:collapse;margin:8px 0}
.rc-t th{background:#17140F;color:#E9DFC9;padding:7px;font-size:.85rem}
.rc-t td{padding:7px;border-bottom:1px solid #eee;text-align:center}
.rc-h{color:#7D6335;margin:16px 0 4px}
.rc-big{font-weight:700;font-size:1.2rem}
@media print{.noprint{display:none!important}.rc{padding:0;background:#fff}@page{margin:10mm}}
`;

export const dynamic = "force-dynamic";

export default async function DebtStatementPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!UUID.test(id) || (type !== "personal" && type !== "store")) notFound();
  await requireAnyPermission([type === "personal" ? "personal_debts" : "store_debts"]);
  const res: any = type === "personal" ? await getPersonalDebtDetail(id) : await getStoreDebtDetail(id);
  const d: Row | null = res.debt;
  if (!d) notFound();
  const pays: Row[] = (res.payments ?? []).filter((p: Row) => !p.reversed_at);
  const items: Row[] = Array.isArray(d.items) ? d.items : [];
  const total = Number(d.original_amount) || 0;
  const paid = Number(d.paid_amount) || 0;
  const rem = Number(d.remaining_amount) || 0;
  const title = type === "personal" ? "كشف دين شخصي" : "كشف مديونية";

  return (
    <div className="rc" dir="rtl">
      <style>{CSS}</style>
      <PrintBar text={`QUEEN STORE\n${title}\n${d.party_name}\nالمتبقي: ${iqd(rem)}`} />
      <div className="rc-box">
        <div className="rc-head">
          <h1><img src="/brand/q-mark.svg" alt="" style={{ height: 34, width: "auto" }} />QUEEN STORE</h1>
          <p>{title}</p>
        </div>
        <div className="rc-in">
          <div className="rc-r"><span>الاسم</span><b>{d.party_name}</b></div>
          {d.party_phone && <div className="rc-r"><span>الهاتف</span><span dir="ltr">{d.party_phone}</span></div>}
          {d.customer?.full_name && <div className="rc-r"><span>العميل</span><span>{d.customer.full_name}</span></div>}
          <div className="rc-r"><span>تاريخ الدين</span><span>{day(d.debt_date)}</span></div>
          {d.reason && <div className="rc-r"><span>السبب</span><span>{d.reason}</span></div>}
          {items.length > 0 && (
            <table className="rc-t"><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>
              {items.map((it, i) => (<tr key={i}><td>{it.name}</td><td>{it.qty}</td><td>{iqd(Number(it.price) || 0)}</td><td>{iqd(Number(it.total) || 0)}</td></tr>))}
            </tbody></table>
          )}
          <div className="rc-r"><span>إجمالي الدين</span><b>{iqd(total)}</b></div>
          <div className="rc-r"><span>المسدد</span><b>{iqd(paid)}</b></div>
          <div className="rc-r"><span>المتبقي</span><b className="rc-big">{iqd(rem)}</b></div>
          <h3 className="rc-h">سجل الدفعات</h3>
          {pays.length === 0 ? <p>لا توجد دفعات مسجلة.</p> : (
            <table className="rc-t"><thead><tr><th>ت</th><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>المتبقي بعدها</th></tr></thead><tbody>
              {[...pays].reverse().map((p, i, arr) => {
                const after = Math.max(0, total - arr.slice(0, i + 1).reduce((s, x) => s + (Number(x.amount) || 0), 0));
                return (<tr key={p.id ?? i}><td>{i + 1}</td><td>{day(p.paid_at)}</td><td>{iqd(Number(p.amount) || 0)}</td><td>{METHOD[p.method] ?? p.method ?? "-"}</td><td>{iqd(after)}</td></tr>);
              })}
            </tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}
