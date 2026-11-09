import { requireAnyPermission } from "../../../../lib/admin/access";
import { getReceipt } from "../../../../lib/finance/receipts";
import { iqd } from "../../../../lib/finance/types";
import { PrintBar } from "./PrintBar";

const TYPE: Record<string, string> = {
  debt: "وصل تسجيل دين", debt_created: "وصل تسجيل دين",
  payment: "وصل استلام دفعة", debt_payment: "وصل استلام دفعة",
  installment: "وصل دفعة قسط", installment_payment: "وصل دفعة قسط",
  settlement: "وصل تسوية", reversal: "وصل عكس دفعة",
};
const METHOD: Record<string, string> = { cash: "نقداً", transfer: "تحويل", qi_card: "Qi Card", other: "أخرى" };
const short = (v: string | null) => (v ? v.slice(0, 8) : null);

const CSS = `
.rc{max-width:520px;margin:0 auto;padding:18px;background:#FBF7EF;color:#17140F}
.rc-box{background:#fff;border:1px solid #B89B6A;border-radius:14px;padding:20px}
.rc h1{margin:0;color:#7D6335;font-size:1.5rem;letter-spacing:.08em}
.rc-r{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eee}
.rc-big{font-size:1.7rem;font-weight:700;color:#17140F;margin:14px 0}
@media print{.noprint{display:none!important}.rc{padding:0;background:#fff}.rc-box{border:0}@page{margin:10mm}}
`;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission(["store_debts", "personal_debts", "installments"]);
  const { id } = await params;
  const r = await getReceipt(id);
  if (!r) return <div className="rc"><div className="rc-box">الوصل غير موجود أو لا تملك صلاحية عرضه.</div></div>;
  const kind = TYPE[r.receipt_type] ?? r.purpose ?? r.receipt_type;
  const amount = r.amount ?? r.total_amount;
  const text = [
    "QUEEN STORE", kind, "رقم الوصل: " + r.receipt_number,
    "الاسم: " + r.party_name, "المبلغ: " + iqd(amount),
    r.remaining_amount != null ? "المتبقي: " + iqd(r.remaining_amount) : "",
  ].filter(Boolean).join("\n");
  const refs = [
    r.order_id && "طلب " + short(r.order_id),
    r.store_debt_id && "دين " + short(r.store_debt_id),
    r.personal_debt_id && "دين " + short(r.personal_debt_id),
    r.installment_id && "خطة " + short(r.installment_id),
  ].filter(Boolean).join(" · ");
  return (
    <div className="rc" dir="rtl">
      <style>{CSS}</style>
      <PrintBar text={text} />
      <div className="rc-box">
        <h1>QUEEN STORE</h1>
        <div style={{ color: "#7D6335", marginTop: 4 }}>{kind}</div>
        <div className="rc-big">{iqd(amount)}</div>
        <div className="rc-r"><span>رقم الوصل</span><b>{r.receipt_number}</b></div>
        <div className="rc-r"><span>التاريخ</span><span>{(r.paid_on ?? r.created_at).slice(0, 10)}</span></div>
        <div className="rc-r"><span>الاسم</span><span>{r.party_name}</span></div>
        {r.method && <div className="rc-r"><span>طريقة الدفع</span><span>{METHOD[r.method] ?? r.method}</span></div>}
        {r.reference && <div className="rc-r"><span>الرقم المرجعي</span><span>{r.reference}</span></div>}
        {r.remaining_amount != null && <div className="rc-r"><span>المتبقي</span><b>{iqd(r.remaining_amount)}</b></div>}
        {refs && <div className="rc-r"><span>مرتبط بـ</span><span>{refs}</span></div>}
        {r.notes && <div className="rc-r"><span>ملاحظات</span><span>{r.notes}</span></div>}
      </div>
    </div>
  );
}
