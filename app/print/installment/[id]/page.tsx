/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { getInstallmentDetail } from "../../../../lib/finance/installments";
import { iqd } from "../../../../lib/finance/types";
import { PrintBar } from "../../receipt/[id]/PrintBar";

type Row = Record<string, any>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHOD: Record<string, string> = { cash: "نقدي", transfer: "تحويل", other: "أخرى" };
const day = (v: unknown) => (v ? String(v).slice(0, 10) : "-");
const n = (v: unknown) => Number(v) || 0;
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

export default async function InstallmentStatementPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission(["installments"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const res: any = await getInstallmentDetail(id);
  const p: Row | null = res.plan;
  if (!p) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const sch: Row[] = res.schedule ?? [];
  const pays: Row[] = (res.payments ?? []).filter((x: Row) => !x.reversed_at);
  const open = sch.filter((s) => n(s.amount_due) - n(s.amount_paid) > 0);
  const next = open[0] ?? null;
  const late = open.filter((s) => String(s.due_date) < today);
  const stateOf = (s: Row) => (n(s.amount_due) - n(s.amount_paid) <= 0 ? "مسدد" : String(s.due_date) < today ? "متأخر" : "قادم");
  const rem = n(p.remaining_amount);
  const paid = n(p.paid_amount);
  const total = n(p.total_amount);

  return (
    <div className="rc" dir="rtl">
      <style>{CSS}</style>
      <PrintBar text={`QUEEN STORE\nكشف خطة تقسيط\n${p.party_name}\nالمتبقي: ${iqd(rem)}`} />
      <div className="rc-box">
        <div className="rc-head">
          <h1><img src="/brand/q-mark.svg" alt="" style={{ height: 34, width: "auto" }} />QUEEN STORE</h1>
          <p>كشف خطة تقسيط</p>
        </div>
        <div className="rc-in">
          <div className="rc-r"><span>الاسم</span><b>{p.party_name}</b></div>
          <div className="rc-r"><span>تاريخ بدء الخطة</span><span>{day(p.start_date)}</span></div>
          <div className="rc-r"><span>إجمالي المبلغ</span><b>{iqd(total)}</b></div>
          <div className="rc-r"><span>الدفعة الأولى</span><span>{iqd(n(p.down_payment))}</span></div>
          <div className="rc-r"><span>عدد الأقساط</span><span>{p.installments_count}</span></div>
          <div className="rc-r"><span>قيمة القسط</span><span>{iqd(n(sch[0]?.amount_due))}</span></div>
          <div className="rc-r"><span>المسدد</span><b>{iqd(paid)}</b></div>
          <div className="rc-r"><span>المتبقي</span><b className="rc-big">{iqd(rem)}</b></div>
          <div className="rc-r"><span>حالة الخطة</span><span>{p.status}</span></div>
          <h3 className="rc-h">جدول الأقساط</h3>
          <table className="rc-t"><thead><tr><th>ت</th><th>الاستحقاق</th><th>المطلوب</th><th>المسدد</th><th>الحالة</th></tr></thead><tbody>
            {sch.map((s) => (<tr key={s.id}><td>{s.seq}</td><td>{day(s.due_date)}</td><td>{iqd(n(s.amount_due))}</td><td>{iqd(n(s.amount_paid))}</td><td>{stateOf(s)}</td></tr>))}
          </tbody></table>
          <h3 className="rc-h">بيان الاستحقاق</h3>
          {next ? (
            <div>
              <div className="rc-r"><span>القسط رقم</span><b>{next.seq}</b></div>
              <div className="rc-r"><span>تاريخ الاستحقاق</span><span>{day(next.due_date)}</span></div>
              <div className="rc-r"><span>المبلغ المطلوب</span><b>{iqd(n(next.amount_due) - n(next.amount_paid))}</b></div>
              <div className="rc-r"><span>حالة القسط</span><span>{stateOf(next)}</span></div>
              <div className="rc-r"><span>عدد الأقساط المتأخرة</span><span>{late.length}</span></div>
              <div className="rc-r"><span>المتبقي الكلي</span><b>{iqd(rem)}</b></div>
            </div>
          ) : <p>لا توجد أقساط مستحقة، الخطة مسددة.</p>}
          <h3 className="rc-h">الدفعات المسجلة</h3>
          {pays.length === 0 ? <p>لا توجد دفعات مسجلة.</p> : (
            <table className="rc-t"><thead><tr><th>رقم الدفعة</th><th>القسط</th><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>المتبقي بعدها</th></tr></thead><tbody>
              {pays.map((x, i) => (<tr key={x.id ?? i}><td>{pays.length - i}</td><td>{x.installment_schedule?.seq ?? "-"}</td><td>{day(x.paid_at)}</td><td>{iqd(n(x.amount))}</td><td>{METHOD[x.method] ?? x.method ?? "-"}</td><td>{iqd(rem + pays.slice(0, i).reduce((s, y) => s + n(y.amount), 0))}</td></tr>))}
            </tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}
