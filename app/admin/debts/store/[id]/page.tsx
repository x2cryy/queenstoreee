import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyPermissions, requireAnyPermission } from "../../../../../lib/admin/access";
import { formatMoney } from "../../../../../lib/admin/format";
import { getStoreDebtDetail } from "../../../../../lib/finance/store";
import { METHOD_LABEL, STATUS_LABEL, STORE_DIR_LONG, effectiveStatus, todayIQ } from "../../../../../lib/finance/debt-labels";
import { ReverseForm } from "../../payments/ReverseForm";
import PayDebt from "../../_ui/PayDebt";
import CancelDebt from "../../_ui/CancelDebt";
import EditStoreDebt from "../EditStoreDebt";
import { cancelStoreDebtAction, payStoreDebtAction } from "../_actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission(["store_debts"]);
  const perms = await getMyPermissions();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { debt: d, payments, receipts, orderNumber, customer, error } = await getStoreDebtDetail(id);
  if (error && !d)
    return (
      <section className="qd-page">
        <div className="qd-msg" data-tone="err" role="alert">تعذر تحميل الدين. <Link href={"/admin/debts/store/" + id}>إعادة المحاولة</Link></div>
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
  const canOrder = perms.includes("orders");
  const canCustomer = perms.includes("customers");

  return (
    <section className="qd-page">
      <p className="qs-muted"><Link href="/admin/debts/store">ديون المتجر</Link></p>
      <header className="qd-head">
        <div>
          <h1 className="qs-h1">{d.party_name}</h1>
          <p className="qs-muted">
            <span className="qd-badge" data-tone={d.direction}>{STORE_DIR_LONG[d.direction]}</span>{" "}
            <span className="qd-badge" data-tone={st}>{STATUS_LABEL[st] ?? st}</span>{" "}
            <span dir="ltr">#{d.id.slice(0, 8)}</span>
          </p>
        </div>
        <div className="qd-actions">
          <Link href={"/print/debt/store/" + d.id} target="_blank" rel="noopener noreferrer" className="qd-btn">كشف الدين</Link>
          {!cancelled && left > 0 ? <PayDebt action={payStoreDebtAction} debtId={d.id} party={d.party_name} direction={d.direction} remaining={left} /> : null}
          {!cancelled ? <EditStoreDebt d={{ id: d.id, party_name: d.party_name, due_date: d.due_date, debt_date: d.debt_date, reason: d.reason, notes: d.notes, linked: !!d.customer_id || !!d.order_id }} /> : null}
        </div>
      </header>

      <div className="qd-sum">
        <div className="qd-stat"><span className="qd-stat-label">المبلغ الأصلي</span><span className="qd-stat-value">{formatMoney(original)}</span></div>
        <div className="qd-stat"><span className="qd-stat-label">{d.direction === "receivable" ? "المستلم" : "المسدد"}</span><span className="qd-stat-value">{formatMoney(paid)}</span></div>
        <div className="qd-stat" data-tone={st === "late" ? "danger" : undefined}><span className="qd-stat-label">المتبقي</span><span className="qd-stat-value">{formatMoney(left)}</span></div>
      </div>

      <div className="qd-card">
        <h2>البيانات</h2>
        <div className="qd-kv"><span>النطاق</span><span>المتجر</span></div>
        <div className="qd-kv"><span>المصدر</span>
          <span>
            {d.order_id ? (
              canOrder ? <Link href={"/admin/orders/" + d.order_id}>طلب <span dir="ltr">#{orderNumber ?? "…"}</span></Link>
                : <>طلب <span dir="ltr">#{orderNumber ?? "…"}</span></>
            ) : "سجل يدوي"}
          </span>
        </div>
        {d.customer_id ? (
          <div className="qd-kv"><span>العميل</span>
            <span>{canCustomer ? <Link href={"/admin/customers/" + d.customer_id}>{customer?.full_name ?? "ملف العميل"}</Link> : (customer?.full_name ?? "عميل مسجل")}</span>
          </div>
        ) : null}
        {customer?.phone ? <div className="qd-kv"><span>الهاتف</span><span dir="ltr">{customer.phone}</span></div> : null}
        <div className="qd-kv"><span>تاريخ البداية</span><span>{d.debt_date}</span></div>
        <div className="qd-kv"><span>الاستحقاق</span><span>{d.due_date ?? "غير محدد"}</span></div>
        {d.reason ? <div className="qd-kv"><span>السبب</span><span>{d.reason}</span></div> : null}
        {d.notes ? <div className="qd-kv"><span>الملاحظات</span><span>{d.notes}</span></div> : null}
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
                    <ReverseForm kind="store" id={p.id} />
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
          {paid === 0 ? (
            <CancelDebt action={cancelStoreDebtAction} id={d.id} hint="لا يُحذف الدين: يبقى في السجل بحالة «ملغي». إن كان مرتبطًا بطلب فيعود مبلغه إلى المتبقي القابل للحفظ كدين. متاح فقط لدين بلا أي دفعات." />
          ) : (
            <p className="qs-muted">لا يمكن إلغاء دين عليه دفعات. اعكس الدفعات أولًا إن لزم.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
