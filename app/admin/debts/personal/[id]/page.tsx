import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRole } from "../../../../../lib/auth/session";
import { formatMoney } from "../../../../../lib/admin/format";
import { getPersonalDebtDetail } from "../../../../../lib/finance/personal";
import { DIR_LONG, METHOD_LABEL, STATUS_LABEL, effectiveStatus, todayIQ } from "../../../../../lib/finance/debt-labels";
import { ReverseForm } from "../../payments/ReverseForm";
import PayDebt from "../../_ui/PayDebt";
import EditDebt from "../EditDebt";
import CancelDebt from "../../_ui/CancelDebt";
import { cancelDebtAction, payDebtAction } from "../_actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if ((await getRole()) !== "owner") redirect("/forbidden");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { debt: d, payments, receipts, error } = await getPersonalDebtDetail(id);
  if (error && !d)
    return (
      <section className="qd-page">
        <div className="qd-msg" data-tone="err" role="alert">تعذر تحميل الدين. <Link href={"/admin/debts/personal/" + id}>إعادة المحاولة</Link></div>
      </section>
    );
  if (!d) notFound();

  const today = todayIQ();
  const original = Number(d.original_amount);
  const paid = Number(d.paid_amount);
  const left = Math.max(0, original - paid);
  const st = effectiveStatus(d.status, d.due_date, today);
  const cancelled = d.status === "cancelled";
  const recByPay = new Map(receipts.filter((r) => r.debt_payment_id).map((r) => [r.debt_payment_id as string, r]));

  return (
    <section className="qd-page">
      <p className="qs-muted"><Link href="/admin/debts/personal">الديون الشخصية</Link></p>
      <header className="qd-head">
        <div>
          <h1 className="qs-h1">{d.party_name}</h1>
          <p className="qs-muted">
            <span className="qd-badge" data-tone={d.direction}>{DIR_LONG[d.direction]}</span>{" "}
            <span className="qd-badge" data-tone={st}>{STATUS_LABEL[st] ?? st}</span>{" "}
            <span dir="ltr">#{d.id.slice(0, 8)}</span>
          </p>
        </div>
        <div className="qd-actions">
          <Link href={"/print/debt/personal/" + d.id} target="_blank" rel="noopener noreferrer" className="qd-btn">كشف الدين</Link>
          <Link href={"/print/person/" + encodeURIComponent(d.party_name)} target="_blank" rel="noopener noreferrer" className="qd-btn">كشف شامل</Link>
          <Link href={"/print/person/" + encodeURIComponent(d.party_name) + "?scope=open"} target="_blank" rel="noopener noreferrer" className="qd-btn">كشف غير المسدد</Link>
          {!cancelled && left > 0 ? <PayDebt action={payDebtAction} debtId={d.id} party={d.party_name} direction={d.direction} remaining={left} /> : null}
          {!cancelled ? <EditDebt d={d} /> : null}
        </div>
      </header>

      <div className="qd-sum">
        <div className="qd-stat"><span className="qd-stat-label">المبلغ الأصلي</span><span className="qd-stat-value">{formatMoney(original)}</span></div>
        <div className="qd-stat"><span className="qd-stat-label">{d.direction === "receivable" ? "المستلم" : "المسدد"}</span><span className="qd-stat-value">{formatMoney(paid)}</span></div>
        <div className="qd-stat" data-tone={st === "late" ? "danger" : undefined}><span className="qd-stat-label">المتبقي</span><span className="qd-stat-value">{formatMoney(left)}</span></div>
      </div>

        {Array.isArray(d.items) && d.items.length > 0 ? (
          <div className="qd-card">
            <h2>تفاصيل الأغراض</h2>
            <table className="ds-table">
              <thead>
                <tr><th>المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
              </thead>
              <tbody>
                {d.items.map((it, i) => (
                  <tr key={i}>
                    <td data-label="المادة">{it.name}</td>
                    <td data-label="الكمية">{it.qty}</td>
                    <td data-label="سعر الوحدة">{formatMoney(it.price)}</td>
                    <td data-label="الإجمالي">{formatMoney(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

      <div className="qd-card">
        <h2>البيانات</h2>
        <div className="qd-kv"><span>النطاق</span><span>شخصي (خارج حسابات المتجر)</span></div>
        <div className="qd-kv"><span>تاريخ البداية</span><span>{d.debt_date}</span></div>
        <div className="qd-kv"><span>الاستحقاق</span><span>{d.due_date ?? "غير محدد"}</span></div>
        {d.party_phone ? <div className="qd-kv"><span>الهاتف</span><span dir="ltr">{d.party_phone}</span></div> : null}
        {d.reason ? <div className="qd-kv"><span>السبب</span><span>{d.reason}</span></div> : null}
        {d.notes ? <div className="qd-kv"><span>الملاحظات</span><span>{d.notes}</span></div> : null}
      </div>

      <div className="qd-card">
        <h2>سجل الدفعات</h2>
        {error ? <div className="qd-msg" data-tone="err" role="alert">تعذر تحميل الدفعات.</div> : null}
        {payments.length === 0 && !error ? <p className="qs-muted">لا توجد دفعات على هذا الدين.</p> : null}
        {payments.map((p) => {
          const rec = recByPay.get(p.id);
          return (
            <div className="qd-pay" key={p.id} data-reversed={p.reversed_at ? "true" : "false"}>
              <div className="qd-pay-top">
                <span>{p.paid_at} · {METHOD_LABEL[p.method] ?? p.method}{p.reference ? " · " + p.reference : ""}</span>
                <b className="qd-pay-amount">{formatMoney(Number(p.amount))}</b>
              </div>
              {p.note ? <span className="qd-sub">{p.note}</span> : null}
              {p.reversed_at ? (
                <span className="qd-badge" data-tone="late">معكوسة{p.reversal_reason ? ": " + p.reversal_reason : ""}</span>
              ) : (
                <>
                  {rec && rec.status === "issued" ? (
                    <Link href={"/print/receipt/" + rec.id} target="_blank" rel="noopener noreferrer">
                      {d.direction === "receivable" ? "وصل استلام " : "وصل تسديد "}{rec.receipt_number}
                    </Link>
                  ) : null}
                  <details className="qd-details">
                    <summary>عكس الدفعة (تصحيح)</summary>
                    <ReverseForm kind="personal" id={p.id} />
                  </details>
                </>
              )}
            </div>
          );
        })}
        {payments.length >= 100 ? <p className="qd-hint">عُرضت آخر 100 دفعة.</p> : null}
      </div>

      {!cancelled ? (
        <div className="qd-card">
          <h2>إجراءات حساسة</h2>
          {paid === 0 ? <CancelDebt action={cancelDebtAction} id={d.id} hint="لا يُحذف الدين: يبقى في السجل بحالة «ملغي» ولا يدخل الملخصات. متاح فقط لدين بلا أي دفعات." /> : <p className="qs-muted">لا يمكن إلغاء دين عليه دفعات. اعكس الدفعات أولًا إن لزم.</p>}
        </div>
      ) : null}
    </section>
  );
}
