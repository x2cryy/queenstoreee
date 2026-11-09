"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addNote, changeStatus, recordPayment, setDelivery } from "../orders/[id]/actions";
import { NEXT_STATUSES, type AdminActionState } from "../../../lib/admin/orders";
import { statusLabel } from "../../../lib/shop/orders";

const init: AdminActionState = { ok: false };

function Msg({ s }: { s: AdminActionState }) {
  if (!s.message) return null;
  return (
    <p className={s.ok ? "ao-ok" : "ao-err"} role={s.ok ? "status" : "alert"}>
      {s.message}
    </p>
  );
}

function Btn({ children, wait }: { children: React.ReactNode; wait: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ao-btn" disabled={pending}>
      {pending ? wait : children}
    </button>
  );
}

export function StatusForm({ orderId, current }: { orderId: string; current: string }) {
  const next = NEXT_STATUSES[current] ?? [];
  const [to, setTo] = useState(next[0] ?? "");
  const [state, action] = useActionState(changeStatus, init);
  if (next.length === 0) {
    return <p className="ao-muted">لا توجد انتقالات متاحة لهذه الحالة.</p>;
  }
  const needsReason = to === "cancelled" || to === "returned";
  return (
    <form
      action={action}
      className="ao-form"
      onSubmit={(e) => {
        if (needsReason && !window.confirm("هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="order_id" value={orderId} />
      <label className="ao-f">
        <span>الحالة الجديدة</span>
        <select name="to" className="ao-in" value={to} onChange={(e) => setTo(e.target.value)}>
          {next.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <label className="ao-f">
        <span>{needsReason ? "السبب (إلزامي)" : "ملاحظة تُحفظ في السجل (اختياري)"}</span>
        <textarea
          name="note"
          className="ao-in"
          maxLength={500}
          required={needsReason}
          minLength={needsReason ? 3 : undefined}
        />
      </label>
      {to === "returned" ? (
        <label className="ao-check">
          <input type="checkbox" name="restock" defaultChecked />
          <span>إعادة القطع إلى المخزون</span>
        </label>
      ) : null}
      {to === "cancelled" ? (
        <p className="ao-muted">الإلغاء يعيد المخزون المخصوم مرة واحدة فقط.</p>
      ) : null}
      <Msg s={state} />
      <Btn wait="جارٍ الحفظ">تحديث الحالة</Btn>
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(addNote, init);
  return (
    <form action={action} className="ao-form">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="ao-f">
        <span>ملاحظة داخلية (لا تظهر للزبون)</span>
        <textarea name="body" className="ao-in" maxLength={1000} required />
      </label>
      <Msg s={state} />
      <Btn wait="جارٍ الحفظ">إضافة ملاحظة</Btn>
    </form>
  );
}

export function DeliveryForm({
  orderId,
  fee,
  notes,
}: {
  orderId: string;
  fee: number;
  notes: string;
}) {
  const [state, action] = useActionState(setDelivery, init);
  return (
    <form action={action} className="ao-form" key={`${fee}-${notes}`}>
      <input type="hidden" name="order_id" value={orderId} />
      <label className="ao-f">
        <span>تكلفة التوصيل (د.ع)</span>
        <input
          name="fee"
          className="ao-in"
          dir="ltr"
          inputMode="numeric"
          maxLength={12}
          defaultValue={String(fee)}
        />
      </label>
      <label className="ao-f">
        <span>ملاحظات التوصيل</span>
        <textarea name="notes" className="ao-in" maxLength={500} defaultValue={notes} />
      </label>
      <Msg s={state} />
      <Btn wait="جارٍ الحفظ">حفظ التوصيل</Btn>
    </form>
  );
}

export function PaymentForm({ orderId, remaining }: { orderId: string; remaining: number }) {
  const [state, action] = useActionState(recordPayment, init);
  return (
    <form action={action} className="ao-form" key={remaining}>
      <input type="hidden" name="order_id" value={orderId} />
      <label className="ao-f">
        <span>المبلغ المستلم (د.ع)</span>
        <input
          name="amount"
          className="ao-in"
          dir="ltr"
          inputMode="numeric"
          maxLength={12}
          required
          defaultValue={remaining > 0 ? String(remaining) : ""}
        />
      </label>
      <label className="ao-f">
        <span>طريقة الاستلام</span>
        <select name="method" className="ao-in" defaultValue="cod">
          <option value="cod">عند الاستلام (نقداً)</option>
          <option value="manual">اتفاق مع المتجر</option>
        </select>
      </label>
      <label className="ao-f">
        <span>مرجع أو ملاحظة (اختياري)</span>
        <input name="reference" className="ao-in" maxLength={120} />
      </label>
      <Msg s={state} />
      <Btn wait="جارٍ الحفظ">تسجيل الدفعة</Btn>
    </form>
  );
}
