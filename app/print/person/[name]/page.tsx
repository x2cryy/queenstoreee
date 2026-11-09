/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireAnyPermission } from "../../../../lib/admin/access";
import { listPersonalDebtsPage, getPersonalDebtDetail } from "../../../../lib/finance/personal";
import { iqd } from "../../../../lib/finance/types";
import { PrintBar } from "../../receipt/[id]/PrintBar";

type Row = Record<string, any>;
const day = (v: unknown) => (v ? String(v).slice(0, 10) : "-");
const CSS = `
.rc{max-width:680px;margin:0 auto;padding:18px;background:#FBF7EF;color:#17140F}
.rc-box{background:#fff;border:3px double #B89B6A;border-radius:14px;padding:0 0 20px;overflow:hidden}
.rc-head{background:#17140F;color:#E9DFC9;text-align:center;padding:18px 12px;border-bottom:4px solid #B89B6A}
.rc-head h1{margin:0;font-size:1.6rem;letter-spacing:.08em;display:inline-flex;align-items:center;gap:8px}
.rc-in{padding:14px 20px}
.rc-r{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee}
.rc-t{width:100%;border-collapse:collapse;margin:8px 0}
.rc-t th{background:#17140F;color:#E9DFC9;padding:7px;font-size:.85rem}
.rc-t td{padding:7px;border-bottom:1px solid #eee;text-align:center}
.rc-h{color:#7D6335;margin:18px 0 4px;border-bottom:2px solid #B89B6A}
.rc-big{font-weight:700;font-size:1.2rem}
@media print{.noprint{display:none!important}.rc{padding:0;background:#fff}@page{margin:10mm}}
`;

export const dynamic = "force-dynamic";

export default async function PersonStatementPage({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<{ scope?: string }> }) {
  await requireAnyPermission(["personal_debts"]);
  const { name: raw } = await params;
  const { scope } = await searchParams;
  const name = decodeURIComponent(raw).trim();
  const onlyOpen = scope === "open";
  const today = new Date().toISOString().slice(0, 10);
  const list: any = await listPersonalDebtsPage({ q: name, dir: "", s: onlyOpen ? "active" : "", page: 1 }, today);
  const rows: Row[] = (list.rows ?? []).filter((r: Row) => String(r.party_name).trim() === name);
  const details: { d: Row; pays: Row[] }[] = [];
  for (const r of rows) {
    const res: any = await getPersonalDebtDetail(r.id);
    if (res.debt) details.push({ d: res.debt, pays: (res.payments ?? []).filter((p: Row) => !p.reversed_at) });
  }
  const sum = (k: string) => details.reduce((s, x) => s + (Number(x.d[k]) || 0), 0);
  const total = sum("original_amount");
  const paid = sum("paid_amount");
  const rem = sum("remaining_amount");
  const scopeLabel = onlyOpen ? "الديون غير المسددة" : "جميع الديون";

  return (
    <div className="rc" dir="rtl">
      <style>{CSS}</style>
      <PrintBar text={`QUEEN STORE\nكشف شامل\n${name}\nالمتبقي: ${iqd(rem)}`} />
      <div className="rc-box">
        <div className="rc-head">
          <h1><img src="/brand/q-mark.svg" alt="" style={{ height: 34, width: "auto" }} />QUEEN STORE</h1>
          <p>كشف شامل</p>
        </div>
        <div className="rc-in">
          <div className="rc-r"><span>الاسم</span><b>{name}</b></div>
          <div className="rc-r"><span>النطاق</span><span>{scopeLabel}</span></div>
          <div className="rc-r"><span>تاريخ الكشف</span><span>{today}</span></div>
          <div className="rc-r"><span>الإجمالي العام</span><b>{iqd(total)}</b></div>
          <div className="rc-r"><span>المسدد العام</span><b>{iqd(paid)}</b></div>
          <div className="rc-r"><span>المتبقي العام</span><b className="rc-big">{iqd(rem)}</b></div>
          {details.length === 0 && <p>لا توجد ديون لهذا الاسم.</p>}
          {details.map(({ d, pays }, n) => (
            <div key={d.id}>
              <h3 className="rc-h">{n + 1}. {d.reason || "دين"} — {day(d.debt_date)}</h3>
              {Array.isArray(d.items) && d.items.length > 0 && (
                <table className="rc-t"><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>
                  {d.items.map((it: Row, i: number) => (<tr key={i}><td>{it.name}</td><td>{it.qty}</td><td>{iqd(Number(it.price) || 0)}</td><td>{iqd(Number(it.total) || 0)}</td></tr>))}
                </tbody></table>
              )}
              <div className="rc-r"><span>الإجمالي</span><b>{iqd(Number(d.original_amount) || 0)}</b></div>
              <div className="rc-r"><span>المسدد</span><b>{iqd(Number(d.paid_amount) || 0)}</b></div>
              <div className="rc-r"><span>المتبقي</span><b>{iqd(Number(d.remaining_amount) || 0)}</b></div>
              {pays.length > 0 && (
                <table className="rc-t"><thead><tr><th>تاريخ الدفعة</th><th>المبلغ</th></tr></thead><tbody>
                  {[...pays].reverse().map((p, i) => (<tr key={p.id ?? i}><td>{day(p.paid_at)}</td><td>{iqd(Number(p.amount) || 0)}</td></tr>))}
                </tbody></table>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
