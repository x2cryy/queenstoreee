import Link from "next/link";
import { requireUser } from "../../../lib/auth/session";
import { myFinance } from "../../../lib/finance/service";
import { iqd } from "../../../lib/finance/types";

type Pay = { amount: number; paid_at: string; method: string };
type Debt = {
  id: string; original_amount: number; paid_amount: number; remaining_amount: number;
  debt_date: string; due_date: string | null; status: string; reason: string | null;
  order_number: string | number | null; overdue: boolean; payments: Pay[];
};
type Sch = { seq: number; due_date: string; amount_due: number; amount_paid: number; state: string };
type Inst = {
  id: string; title: string; total_amount: number; down_payment: number; paid_amount: number;
  remaining_amount: number; status: string; order_number: string | number | null; schedule: Sch[];
};
type Rec = { id?: string; receipt_number?: string; amount?: number; total_amount?: number; paid_on?: string; created_at?: string };
type Data = { debts: Debt[]; installments: Inst[]; receipts: Rec[] };

const METHOD: Record<string, string> = { cash: "نقداً", transfer: "تحويل", qi_card: "Qi Card", other: "أخرى" };
const DEBT: Record<string, string> = { open: "غير مدفوع", partial: "مدفوع جزئياً", paid: "مدفوع بالكامل" };
const PLAN: Record<string, string> = { active: "نشطة", completed: "مكتملة" };
const SCH: Record<string, string> = { upcoming: "قادم", due: "مستحق", partial: "مدفوع جزئياً", paid: "مدفوع بالكامل", late: "متأخر", overdue: "متأخر" };
const CSS = `
.fn{max-width:640px;margin:0 auto;padding:16px;color:#17140F}
.fn h1{color:#7D6335;margin:0 0 4px}
.fn-c{background:#fff;border:1px solid #e6dcc6;border-radius:14px;padding:16px;margin:12px 0}
.fn-r{display:flex;justify-content:space-between;gap:10px;padding:6px 0}
.fn-m{color:#7D6335;font-size:.9rem}
.fn-b{display:inline-block;padding:3px 10px;border-radius:999px;border:1px solid #B89B6A;color:#7D6335;font-size:.8rem;white-space:nowrap}
.fn-late{border-color:#b3261e;color:#b3261e}
.fn-big{font-size:1.6rem;font-weight:700}
.fn summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}
`;

export default async function Page() {
  await requireUser("/account/finance");
  const r = await myFinance();
  const d = (r.ok ? r.data : null) as Data | null;
  const debts = d?.debts ?? [];
  const insts = d?.installments ?? [];
  const recs = d?.receipts ?? [];
  const owed = debts.reduce((a, x) => a + Number(x.remaining_amount), 0);
  return (
    <div className="fn" dir="rtl">
      <style>{CSS}</style>
      <h1>حسابي المالي</h1>
      {!r.ok && <div className="fn-c">تعذر تحميل البيانات. حاول لاحقاً.</div>}
      <div className="fn-c">
        <div className="fn-m">إجمالي المتبقي عليك للمتجر</div>
        <div className="fn-big">{iqd(owed)}</div>
      </div>
      <h2>الديون</h2>
      {debts.length === 0 && <div className="fn-c">لا توجد ديون.</div>}
      {debts.map((x) => (
        <div className="fn-c" key={x.id}>
          <div className="fn-r">
            <b>{x.order_number ? "طلب " + x.order_number : x.reason || "دين"}</b>
            <span className={"fn-b" + (x.overdue ? " fn-late" : "")}>{x.overdue ? "متأخر" : DEBT[x.status] ?? x.status}</span>
          </div>
          <div className="fn-r"><span>المبلغ</span><span>{iqd(x.original_amount)}</span></div>
          <div className="fn-r"><span>المدفوع</span><span>{iqd(x.paid_amount)}</span></div>
          <div className="fn-r"><span>المتبقي</span><b>{iqd(x.remaining_amount)}</b></div>
          {x.due_date && <div className="fn-m">الاستحقاق {x.due_date}</div>}
          {x.payments.length > 0 && (
            <details>
              <summary>الدفعات</summary>
              {x.payments.map((p, i) => (
                <div className="fn-r" key={i}><span>{p.paid_at} · {METHOD[p.method] ?? p.method}</span><span>{iqd(p.amount)}</span></div>
              ))}
            </details>
          )}
        </div>
      ))}
      <h2>الأقساط</h2>
      {insts.length === 0 && <div className="fn-c">لا توجد أقساط.</div>}
      {insts.map((x) => (
        <div className="fn-c" key={x.id}>
          <div className="fn-r"><b>{x.title}</b><span className="fn-b">{PLAN[x.status] ?? x.status}</span></div>
          <div className="fn-r"><span>الإجمالي</span><span>{iqd(x.total_amount)}</span></div>
          <div className="fn-r"><span>المدفوع (مع المقدمة)</span><span>{iqd(x.paid_amount)}</span></div>
          <div className="fn-r"><span>المتبقي</span><b>{iqd(x.remaining_amount)}</b></div>
          <details>
            <summary>جدول الاستحقاق</summary>
            {x.schedule.map((s) => (
              <div className="fn-r" key={s.seq}>
                <span>قسط {s.seq} · {s.due_date}</span>
                <span>{iqd(s.amount_paid)} / {iqd(s.amount_due)} <span className={"fn-b" + (s.state === "late" || s.state === "overdue" ? " fn-late" : "")}>{SCH[s.state] ?? s.state}</span></span>
              </div>
            ))}
          </details>
        </div>
      ))}
      <h2>الوصول</h2>
      {recs.length === 0 && <div className="fn-c">لا توجد وصول.</div>}
      {recs.map((x, i) => (
        <div className="fn-c" key={x.id ?? i}>
          <div className="fn-r">
            <b>{x.receipt_number ?? "وصل"}</b>
            <span>{iqd(x.amount ?? x.total_amount)}</span>
          </div>
          <div className="fn-m">{(x.paid_on ?? x.created_at ?? "").slice(0, 10)}</div>
          {x.id && <Link href={"/account/finance/receipt/" + x.id}>عرض الوصل</Link>}
        </div>
      ))}
    </div>
  );
}
