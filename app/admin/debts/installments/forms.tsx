"use client";
import { useActionState, useEffect, useState } from "react";
import { createPlanAction, payInstAction, rescheduleAction } from "../_inst_actions";
import { PAY_METHODS, newIdem } from "../../../../lib/finance/types";

type S = { ok: boolean; message: string } | null;
export type Cust = { id: string; full_name: string; phone: string | null };
export type Sch = { id: string; seq: number; due_date: string; amount_due: number; amount_paid: number };

function Msg({ s }: { s: S }) {
  if (!s) return null;
  return <div className={"qa-note " + (s.ok ? "qa-ok" : "qa-err")}>{s.message}</div>;
}
function useIdem(state: S) {
  const [idem, setIdem] = useState(newIdem);
  useEffect(() => { if (state?.ok) setIdem(newIdem()); }, [state]);
  return idem;
}

export function CreatePlanForm({ customers }: { customers: Cust[] }) {
  const [state, action, pending] = useActionState(createPlanAction, null);
  const idem = useIdem(state);
  return (
    <details className="qa-card qa-details">
      <summary>إنشاء خطة أقساط</summary>
      <form className="qa-form" action={action}>
        <input type="hidden" name="idem" value={idem} />
        <label className="qa-label">الزبون</label>
        <select className="qa-input" name="customer" required defaultValue="">
          <option value="" disabled>اختر الزبون</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}{c.phone ? " - " + c.phone : ""}</option>
          ))}
        </select>
        <label className="qa-label">عنوان الخطة</label>
        <input className="qa-input" name="title" required />
        <label className="qa-label">المبلغ الإجمالي (د.ع)</label>
        <input className="qa-input" name="total" inputMode="numeric" required />
        <label className="qa-label">الدفعة المقدمة (د.ع)</label>
        <input className="qa-input" name="down" inputMode="numeric" defaultValue="0" />
        <label className="qa-label">طريقة الدفعة المقدمة</label>
        <select className="qa-input" name="down_method" defaultValue="cash">
          {PAY_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </select>
        <label className="qa-label">رقم مرجعي للمقدمة</label>
        <input className="qa-input" name="down_ref" />
        <label className="qa-label">عدد الأقساط</label>
        <input className="qa-input" name="count" inputMode="numeric" required />
        <label className="qa-label">تاريخ أول استحقاق</label>
        <input className="qa-input" name="start" type="date" required />
        <label className="qa-label">الدورية</label>
        <select className="qa-input" name="frequency" defaultValue="monthly">
          <option value="weekly">أسبوعي</option>
          <option value="biweekly">كل أسبوعين</option>
          <option value="monthly">شهري</option>
        </select>
        <label className="qa-label">معرّف الطلب (اختياري)</label>
        <input className="qa-input" name="order" dir="ltr" />
        <label className="qa-label">ملاحظات</label>
        <input className="qa-input" name="notes" />
        <button className="qa-btn" disabled={pending}>{pending ? "جارٍ الحفظ" : "إنشاء الخطة"}</button>
        <Msg s={state} />
      </form>
    </details>
  );
}

const left = (r: Sch) => Number(r.amount_due) - Number(r.amount_paid);

export function PayInstForm({ planId, rows }: { planId: string; rows: Sch[] }) {
  const [state, action, pending] = useActionState(payInstAction, null);
  const idem = useIdem(state);
  const open = rows.filter((r) => left(r) > 0);
  return (
    <details className="qa-details">
      <summary>تسجيل دفعة</summary>
      <form className="qa-form" action={action}>
        <input type="hidden" name="idem" value={idem} />
        <input type="hidden" name="plan_id" value={planId} />
        <label className="qa-label">القسط</label>
        <select className="qa-input" name="schedule" defaultValue="">
          <option value="">تلقائي</option>
          {open.map((r) => (
            <option key={r.id} value={r.id}>قسط {r.seq} - متبقي {left(r).toLocaleString("en-US")}</option>
          ))}
        </select>
        <label className="qa-label">المبلغ (د.ع)</label>
        <input className="qa-input" name="amount" inputMode="numeric" required />
        <label className="qa-label">طريقة الدفع</label>
        <select className="qa-input" name="method" defaultValue="cash">
          {PAY_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </select>
        <label className="qa-label">التاريخ</label>
        <input className="qa-input" name="paid_at" type="date" />
        <label className="qa-label">رقم مرجعي</label>
        <input className="qa-input" name="reference" />
        <label className="qa-label">ملاحظات</label>
        <input className="qa-input" name="note" />
        <button className="qa-btn" disabled={pending}>{pending ? "جارٍ الحفظ" : "تأكيد الدفعة"}</button>
        <Msg s={state} />
      </form>
    </details>
  );
}

export function RescheduleForm({ rows }: { rows: Sch[] }) {
  const [state, action, pending] = useActionState(rescheduleAction, null);
  const open = rows.filter((r) => left(r) > 0);
  if (open.length === 0) return null;
  return (
    <details className="qa-details">
      <summary>إعادة جدولة قسط</summary>
      <form className="qa-form" action={action}>
        <label className="qa-label">القسط</label>
        <select className="qa-input" name="schedule" required defaultValue="">
          <option value="" disabled>اختر القسط</option>
          {open.map((r) => (<option key={r.id} value={r.id}>قسط {r.seq} - {r.due_date}</option>))}
        </select>
        <label className="qa-label">التاريخ الجديد</label>
        <input className="qa-input" name="new_due" type="date" required />
        <label className="qa-label">السبب</label>
        <input className="qa-input" name="reason" required />
        <button className="qa-btn" disabled={pending}>{pending ? "جارٍ الحفظ" : "حفظ"}</button>
        <Msg s={state} />
      </form>
    </details>
  );
}
