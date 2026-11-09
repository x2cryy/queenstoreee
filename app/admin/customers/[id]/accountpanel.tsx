import Link from "next/link";
import { createClient } from "../../../../lib/supabase/server";
import { fmtIQD, fmtDate } from "../../../../lib/admin/fmt";
import {
  STORE_DIR_LABEL,
  STATUS_LABEL,
  effectiveStatus,
  todayIQ,
} from "../../../../lib/finance/debt-labels";
import { Panel, KpiGrid, Badge, Empty } from "../../_components/ui";

type Debt = {
  id: string;
  direction: string | null;
  reason: string | null;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: string | null;
  order_id?: string | null;
};
type Inst = {
  id: string;
  direction: string | null;
  title: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string | null;
  order_id?: string | null;
};
type Acct = {
  owed_debts_left: number;
  owed_debts_overdue: number;
  owed_debts_paid: number;
  owed_inst_left: number;
  owed_inst_overdue: number;
  owed_inst_paid: number;
  store_owes_debts: number;
  store_owes_inst: number;
  last_payment_at: string | null;
};
type Mv = {
  occurred_on: string;
  kind: string;
  ref_id: string;
  label: string | null;
  charge: number;
  payment: number;
  reversed: boolean;
  method: string | null;
  reference: string | null;
};

const INST_STATUS: Record<string, string> = { active: "نشط", completed: "مكتمل", cancelled: "ملغي" };
const KIND: Record<string, string> = {
  debt: "دين",
  installment: "خطة قسط",
  debt_payment: "تسديد",
  installment_payment: "تسديد قسط",
};
const LIMIT = 100;

export async function AccountPanel({
  customerId,
  debts,
  insts,
  from,
  to,
}: {
  customerId: string;
  debts: Debt[];
  insts: Inst[];
  from: string;
  to: string;
}) {
  const sb = await createClient();
  const [ar, lr] = await Promise.all([
    sb.rpc("admin_customer_account", { p_customer_id: customerId }),
    sb.rpc("admin_customer_ledger", {
      p_customer_id: customerId,
      p_from: from || null,
      p_to: to || null,
    }),
  ]);

  if (ar.error || !ar.data || lr.error) {
    const code = (ar.error ?? lr.error)?.code;
    return (
      <Panel title="الحساب والتسديدات">
        <Empty>تعذر تحميل الحساب المالي. هذا لا يعني عدم وجود ديون.</Empty>
        {code ? <small className="qa-muted" dir="ltr">{code}</small> : null}
      </Panel>
    );
  }

  const a = ar.data as Acct;
  const mv = (lr.data ?? []) as Mv[];
  const today = todayIQ();

  const rows: (Mv & { bal: number })[] = [];
  let bal = 0;
  for (const m of mv) {
    if (!from) bal += Number(m.charge) - (m.reversed ? 0 : Number(m.payment));
    rows.push({ ...m, bal });
  }
  const totCharge = mv.reduce((x, m) => x + Number(m.charge), 0);
  const totPaid = mv.reduce((x, m) => x + (m.reversed ? 0 : Number(m.payment)), 0);
  const owedNow = a.owed_debts_left + a.owed_inst_left;
  const mismatch = !from && !to && Math.abs(bal - owedNow) > 0;
  const storeOwes = a.store_owes_debts + a.store_owes_inst;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <KpiGrid
        items={[
          {
            label: "المتبقي من الديون",
            value: fmtIQD(a.owed_debts_left),
            hint: a.owed_debts_overdue > 0 ? `متأخر منه ${fmtIQD(a.owed_debts_overdue)}` : undefined,
          },
          {
            label: "المتبقي من الأقساط",
            value: fmtIQD(a.owed_inst_left),
            hint: a.owed_inst_overdue > 0 ? `متأخر منه ${fmtIQD(a.owed_inst_overdue)}` : undefined,
          },
          { label: "مدفوع على الديون", value: fmtIQD(a.owed_debts_paid) },
          { label: "مدفوع على الأقساط", value: fmtIQD(a.owed_inst_paid) },
          {
            label: "آخر تسديد",
            value: a.last_payment_at ? fmtDate(a.last_payment_at) : "-",
            hint: a.last_payment_at ? undefined : "لا حركات تسديد مسجلة",
          },
        ]}
      />
      <p className="ds-desc">
        الديون والأقساط تُعرض منفصلة دون جمعها. لتسجيل دفعة افتح الدين من القائمة أدناه.
      </p>

      {storeOwes > 0 ? (
        <Panel title="مستحقات للعميل على المتجر">
          <p className="ds-desc">
            هذه مبالغ على المتجر للعميل، ولا تُحتسب ضمن ما على العميل. ديون: {fmtIQD(a.store_owes_debts)} · أقساط:{" "}
            {fmtIQD(a.store_owes_inst)}
          </p>
        </Panel>
      ) : null}

      <Panel title="ديون المتجر">
        {debts.length === 0 ? (
          <Empty>لا توجد ديون لهذا العميل.</Empty>
        ) : (
          <>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>السبب</th>
                  <th>الاتجاه</th>
                  <th>الأصلي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الاستحقاق</th>
                  <th>الحالة</th>
                  <th>الطلب</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => {
                  const st = effectiveStatus(d.status ?? "open", d.due_date, today);
                  return (
                    <tr key={d.id}>
                      <td data-label="السبب">
                        <Link href={`/admin/debts/store/${d.id}`}>{d.reason ?? "-"}</Link>
                      </td>
                      <td data-label="الاتجاه">{STORE_DIR_LABEL[d.direction ?? ""] ?? "-"}</td>
                      <td data-label="الأصلي">{fmtIQD(d.original_amount)}</td>
                      <td data-label="المدفوع">{fmtIQD(d.paid_amount)}</td>
                      <td data-label="المتبقي">{fmtIQD(d.remaining_amount)}</td>
                      <td data-label="الاستحقاق">{d.due_date ? fmtDate(d.due_date) : "-"}</td>
                      <td data-label="الحالة"><Badge>{STATUS_LABEL[st] ?? st}</Badge></td>
                      <td data-label="الطلب">{d.order_id ? <Link href={`/admin/orders/${d.order_id}`}>عرض الطلب</Link> : "يدوي"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {debts.length >= LIMIT ? <p className="ds-desc">يُعرض أحدث {LIMIT} سجل فقط.</p> : null}
          </>
        )}
      </Panel>

      <Panel title="الأقساط التجارية">
        {insts.length === 0 ? (
          <Empty>لا توجد أقساط لهذا العميل.</Empty>
        ) : (
          <>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>الاتجاه</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                  <th>الطلب</th>
                </tr>
              </thead>
              <tbody>
                {insts.map((i) => (
                  <tr key={i.id}>
                    <td data-label="العنوان">{i.title ?? "-"}</td>
                    <td data-label="الاتجاه">{STORE_DIR_LABEL[i.direction ?? ""] ?? "-"}</td>
                    <td data-label="الإجمالي">{fmtIQD(i.total_amount)}</td>
                    <td data-label="المدفوع">{fmtIQD(i.paid_amount)}</td>
                    <td data-label="المتبقي">{fmtIQD(i.remaining_amount)}</td>
                    <td data-label="الحالة"><Badge>{INST_STATUS[i.status ?? ""] ?? "-"}</Badge></td>
                    <td data-label="الطلب">{i.order_id ? <Link href={`/admin/orders/${i.order_id}`}>عرض الطلب</Link> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ds-desc">
              <Link href="/admin/debts/installments">فتح قسم الأقساط</Link> لتسجيل دفعة أو إعادة جدولة.
            </p>
          </>
        )}
      </Panel>

      <Panel title="كشف الحساب">
        <form method="get" className="ds-filters">
          <input type="hidden" name="tab" value="account" />
          <input className="ds-input" type="date" name="sf" defaultValue={from} aria-label="من تاريخ" />
          <input className="ds-input" type="date" name="st" defaultValue={to} aria-label="إلى تاريخ" />
          <button className="ds-btn ds-btn-gold" type="submit">عرض</button>
          {from || to ? (
            <Link className="ds-btn" href={`/admin/customers/${customerId}?tab=account`}>كل الفترة</Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <Empty>لا توجد حركات مسجلة في هذه الفترة.</Empty>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>مطلوب</th>
                <th>مسدد</th>
                {!from ? <th>الرصيد</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((m, idx) => (
                <tr key={`${m.kind}-${m.ref_id}-${idx}`} style={m.reversed ? { opacity: 0.6 } : undefined}>
                  <td data-label="التاريخ">{fmtDate(m.occurred_on)}</td>
                  <td data-label="البيان">
                    {KIND[m.kind] ?? m.kind}
                    {m.label ? <small className="qa-muted"> · {m.label}</small> : null}
                    {m.reversed ? <> <Badge>معكوسة</Badge></> : null}
                  </td>
                  <td data-label="مطلوب">{m.charge > 0 ? fmtIQD(m.charge) : "-"}</td>
                  <td data-label="مسدد">{m.payment > 0 ? fmtIQD(m.payment) : "-"}</td>
                  {!from ? <td data-label="الرصيد">{fmtIQD(m.bal)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="ds-desc">
          إجمالي المطلوب في العرض: {fmtIQD(totCharge)} · إجمالي المسدد: {fmtIQD(totPaid)}. الدفعات المعكوسة لا تُحتسب.
        </p>
        {from ? (
          <p className="ds-desc">
            الرصيد الافتتاحي غير محسوب عند تحديد تاريخ بداية. يظهر الرصيد التراكمي عند عرض الفترة من البداية.
          </p>
        ) : null}
        {mismatch ? (
          <p className="ds-desc">
            تنبيه: رصيد الحركات ({fmtIQD(bal)}) لا يطابق المتبقي في سجلات الديون والأقساط ({fmtIQD(owedNow)}). قد يكون
            السبب دفعات قديمة أو دفعة مقدمة غير مسجلة كحركة، فلا تعتمد الكشف وحده.
          </p>
        ) : null}
        <p className="ds-desc">الكشف مبني على الحركات المسجلة في النظام فقط، وليس إثباتًا لسداد كل المبالغ.</p>
      </Panel>
    </div>
  );
}
