import { requireUser } from "../../../../../lib/auth/session";
import { getMyReceipt } from "../../../../../lib/finance/service";
import { iqd } from "../../../../../lib/finance/types";
import { Actions } from "./Actions";

type R = {
  receipt_number: string; amount: number | null; total_amount: number | null;
  remaining_amount: number | null; method: string | null; reference: string | null;
  paid_on: string | null; created_at: string; order_number: string | number | null;
};
const METHOD: Record<string, string> = { cash: "نقداً", transfer: "تحويل", qi_card: "Qi Card", other: "أخرى" };
const CSS = `
.rc{max-width:520px;margin:0 auto;padding:18px;background:#FBF7EF;color:#17140F}
.rc-box{background:#fff;border:1px solid #B89B6A;border-radius:14px;padding:20px}
.rc h1{margin:0;color:#7D6335;letter-spacing:.08em}
.rc-r{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eee}
.rc-big{font-size:1.7rem;font-weight:700;margin:14px 0}
@media print{.noprint{display:none!important}.rc{padding:0;background:#fff}.rc-box{border:0}}
`;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser("/account/finance");
  const res = await getMyReceipt(id);
  const r = (res.ok ? res.data : null) as R | null;
  if (!r) return <div className="rc" dir="rtl"><div className="rc-box">الوصل غير موجود.</div></div>;
  const amount = r.amount ?? r.total_amount;
  const text = ["QUEEN STORE", "رقم الوصل: " + r.receipt_number, "المبلغ: " + iqd(amount)].join("\n");
  return (
    <div className="rc" dir="rtl">
      <style>{CSS}</style>
      <Actions text={text} />
      <div className="rc-box">
        <h1>QUEEN STORE</h1>
        <div className="rc-big">{iqd(amount)}</div>
        <div className="rc-r"><span>رقم الوصل</span><b>{r.receipt_number}</b></div>
        <div className="rc-r"><span>التاريخ</span><span>{(r.paid_on ?? r.created_at).slice(0, 10)}</span></div>
        {r.method && <div className="rc-r"><span>طريقة الدفع</span><span>{METHOD[r.method] ?? r.method}</span></div>}
        {r.reference && <div className="rc-r"><span>الرقم المرجعي</span><span>{r.reference}</span></div>}
        {r.order_number && <div className="rc-r"><span>رقم الطلب</span><span>{r.order_number}</span></div>}
        {r.remaining_amount != null && <div className="rc-r"><span>المتبقي</span><b>{iqd(r.remaining_amount)}</b></div>}
      </div>
    </div>
  );
}
