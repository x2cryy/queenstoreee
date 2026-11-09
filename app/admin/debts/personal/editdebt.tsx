"use client";

import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "../_ui/Modal";
import { useFormAction } from "../_ui/useFormAction";
import { updateDebtAction } from "./_actions";
import type { DebtResult } from "../../../../lib/finance/debt-result";

type D = {
  id: string;
  party_name: string;
  party_phone: string | null;
  due_date: string | null;
  debt_date: string;
  reason: string | null;
  notes: string | null;
};

export default function EditDebt({ d }: { d: D }) {
  return (
    <Modal trigger="تعديل البيانات" title="تعديل بيانات الدين">
      <EditForm d={d} />
    </Modal>
  );
}

function EditForm({ d }: { d: D }) {
  const router = useRouter();
  const close = useModalClose();
  const { state, pending, onSubmit } = useFormAction<DebtResult>(updateDebtAction, (r) => {
    if (r.ok) {
      close();
      router.refresh();
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <input type="hidden" name="id" value={d.id} />
      <p className="qd-hint">المبلغ والاتجاه لا يتغيران من هنا. المبلغ يتغير فقط عبر الدفعات.</p>
      <div className="qd-grid2" style={{ marginTop: 10 }}>
        <label className="qd-field">الطرف
          <input className="qd-input" name="party" defaultValue={d.party_name} required maxLength={120} />
        </label>
        <label className="qd-field">الهاتف
          <input className="qd-input" name="phone" dir="ltr" defaultValue={d.party_phone ?? ""} />
        </label>
        <label className="qd-field">الاستحقاق
          <input className="qd-input" type="date" name="due" min={d.debt_date} defaultValue={d.due_date ?? ""} />
        </label>
        <label className="qd-field">العنوان أو السبب
          <input className="qd-input" name="reason" defaultValue={d.reason ?? ""} maxLength={200} />
        </label>
      </div>
      <label className="qd-field" style={{ marginTop: 10 }}>ملاحظات
        <textarea className="qd-input" name="notes" defaultValue={d.notes ?? ""} maxLength={1000} />
      </label>
      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      <button type="submit" className="qd-btn qd-btn-primary" disabled={pending} style={{ width: "100%", marginTop: 12 }}>
        {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
      </button>
    </form>
  );
}
