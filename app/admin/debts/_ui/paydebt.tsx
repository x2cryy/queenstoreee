"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "./Modal";
import { useFormAction } from "./useFormAction";
import type { DebtResult } from "../../../../lib/finance/debt-result";
import { PAY_METHODS } from "../../../../lib/finance/types";
import { formatMoney } from "../../../../lib/admin/format";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";

const num = (v: string) => Number(toDigits(v).replace(/[,\s٬]/g, "")) || 0;

type Action = (prev: DebtResult | null, f: FormData) => Promise<DebtResult | null>;
type P = { debtId: string; party: string; direction: string; remaining: number; action: Action };

export default function PayDebt(p: P) {
  const label = p.direction === "receivable" ? "استلام دفعة" : "تسديد دفعة";
  // key = remaining: when the balance changes the form remounts with fresh values.
  return (
    <Modal trigger={label} title={label} tone="primary">
      <PayForm key={p.remaining} {...p} label={label} />
    </Modal>
  );
}

function PayForm({ debtId, party, direction, remaining, action, label }: P & { label: string }) {
  const router = useRouter();
  const close = useModalClose();
  const [amount, setAmount] = useState(String(remaining));
  const { state, pending, onSubmit } = useFormAction<DebtResult>(action, (r) => {
    if (r.ok) {
      close();
      router.refresh();
    }
  });
  const n = num(amount);
  const valid = n > 0 && n <= remaining;

  return (
    <form onSubmit={onSubmit} noValidate>
      <input type="hidden" name="debt_id" value={debtId} />
      <div className="qd-kv"><span>الطرف</span><b>{party}</b></div>
      <div className="qd-kv"><span>المتبقي الحالي</span><b>{formatMoney(remaining)}</b></div>
      <div className="qd-grid2" style={{ marginTop: 12 }}>
        <label className="qd-field">{direction === "receivable" ? "المبلغ المستلم (د.ع)" : "المبلغ المسدد (د.ع)"}
          <input className="qd-input" name="amount" inputMode="numeric" dir="ltr" autoComplete="off" value={amount} onChange={(e) => setAmount(toDigits(e.target.value))} required />
        </label>
        <label className="qd-field">التاريخ
          <input className="qd-input" type="date" name="paid_at" defaultValue={todayIQ()} max={todayIQ()} />
        </label>
        <label className="qd-field">طريقة الدفع
          <select className="qd-input" name="method" defaultValue="cash">
            {PAY_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
        </label>
        <label className="qd-field">المرجع (اختياري)
          <input className="qd-input" name="reference" maxLength={120} />
        </label>
      </div>
      <label className="qd-field" style={{ marginTop: 10 }}>ملاحظة (اختياري)
        <input className="qd-input" name="note" maxLength={500} />
      </label>
      {n > remaining ? (<div className="qd-msg" data-tone="err" role="alert">المبلغ أكبر من المتبقي.</div>) : null}
      {valid ? (<p className="qd-hint">المتبقي بعد الدفعة: {formatMoney(remaining - n)}</p>) : null}
      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      {state?.stale ? (<button type="button" className="qd-btn" onClick={() => router.refresh()}>تحديث الرصيد</button>) : null}
      <button type="submit" className="qd-btn qd-btn-primary" disabled={pending || !valid} style={{ width: "100%", marginTop: 12 }}>
        {pending ? "جارٍ الحفظ…" : direction === "receivable" ? "تأكيد الاستلام" : "تأكيد التسديد"}
      </button>
    </form>
  );
}
