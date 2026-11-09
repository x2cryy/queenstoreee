"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "../_ui/Modal";
import { useFormAction } from "../_ui/useFormAction";
import { createDebtAction } from "./_actions";
import type { DebtResult } from "../../../../lib/finance/debt-result";
import { PAY_METHODS, newIdem } from "../../../../lib/finance/types";
import { formatMoney } from "../../../../lib/admin/format";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";
import ItemsEditor from "../_ui/ItemsEditor";

const num = (v: string) => Number(toDigits(v).replace(/[,\s٬]/g, "")) || 0;

export default function CreateDebt() {
  return (
    <Modal trigger="إنشاء دين" title="إنشاء دين شخصي" tone="primary">
      <CreateForm />
    </Modal>
  );
}

function CreateForm() {
  const router = useRouter();
  const close = useModalClose();
  const [idem, setIdem] = useState(newIdem);
  const [dir, setDir] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [debtDate, setDebtDate] = useState(todayIQ());
  const { state, pending, onSubmit } = useFormAction<DebtResult>(createDebtAction, (r) => {
    if (r.ok && r.id) {
      setIdem(newIdem());
      close();
      router.push("/admin/debts/personal/" + r.id);
    }
  });
  const total = num(amount);
  const paidN = num(paid);
  const canSubmit = !!dir && total > 0 && paidN >= 0 && paidN <= total;

  const paidLabel =
    dir === "receivable"
      ? "مبلغ استلمته سابقًا (اختياري)"
      : dir === "payable"
        ? "مبلغ سددته سابقًا (اختياري)"
        : "دفعة سبق تسديدها (اختياري)";

  return (
    <form onSubmit={onSubmit} noValidate>
      <input type="hidden" name="idem" value={idem} />

      <fieldset className="qd-sec">
        <legend>1. الطرف والسبب</legend>
        <div className="qd-grid2">
          <label className="qd-field">اسم الشخص أو الجهة
            <input className="qd-input" name="party" required maxLength={120} autoComplete="off" />
          </label>
          <label className="qd-field">رقم الهاتف (اختياري)
            <input className="qd-input" name="phone" inputMode="tel" dir="ltr" autoComplete="off" />
          </label>
        </div>
        <label className="qd-field" style={{ marginTop: 10 }}>عنوان الدين أو سببه (اختياري)
          <input className="qd-input" name="reason" maxLength={200} />
        </label>
      </fieldset>

      <fieldset className="qd-sec">
        <legend>2. المبلغ والاتجاه</legend>
        <div className="qd-grid2">
          <label className="qd-choice">
            <input type="radio" name="direction" value="receivable" checked={dir === "receivable"} onChange={() => setDir("receivable")} required />
            <span>لي: الطرف مدين لي</span>
          </label>
          <label className="qd-choice">
            <input type="radio" name="direction" value="payable" checked={dir === "payable"} onChange={() => setDir("payable")} />
            <span>عليّ: أنا مدين للطرف</span>
          </label>
        </div>
        <p className="qd-hint">الاتجاه لا يمكن تغييره بعد الحفظ.</p>
        <div className="qd-grid2" style={{ marginTop: 10 }}>
          <label className="qd-field">المبلغ (د.ع)
            <input className="qd-input" name="amount" inputMode="numeric" dir="ltr" autoComplete="off" value={amount} onChange={(e) => setAmount(toDigits(e.target.value))} required />
          </label>
          <label className="qd-field">{paidLabel}
            <input className="qd-input" name="paid" inputMode="numeric" dir="ltr" autoComplete="off" value={paid} onChange={(e) => setPaid(toDigits(e.target.value))} />
          </label>
        </div>
        <ItemsEditor onTotal={(t) => setAmount(String(t))} />
        {total > 0 && paidN <= total ? (
          <p className="qd-hint">المتبقي بعد الحفظ: {formatMoney(total - paidN)}</p>
        ) : null}
        {paidN > total && total > 0 ? (
          <div className="qd-msg" data-tone="err" role="alert">الدفعة السابقة أكبر من مبلغ الدين.</div>
        ) : null}
        {paidN > 0 ? (
          <div className="qd-grid2" style={{ marginTop: 10 }}>
            <label className="qd-field">طريقة الدفع
              <select className="qd-input" name="method" defaultValue="cash">
                {PAY_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </label>
            <label className="qd-field">تاريخ الدفعة
              <input className="qd-input" type="date" name="paid_at" defaultValue={todayIQ()} max={todayIQ()} />
            </label>
            <label className="qd-field">المرجع (اختياري)
              <input className="qd-input" name="reference" maxLength={120} />
            </label>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="qd-sec">
        <legend>3. التواريخ</legend>
        <div className="qd-grid2">
          <label className="qd-field">تاريخ الدين
            <input className="qd-input" type="date" name="debt_date" value={debtDate} onChange={(e) => setDebtDate(e.target.value)} />
          </label>
          <label className="qd-field">تاريخ الاستحقاق (اختياري)
            <input className="qd-input" type="date" name="due" min={debtDate} />
          </label>
        </div>
      </fieldset>

      <fieldset className="qd-sec">
        <legend>4. ملاحظات</legend>
        <textarea className="qd-input" name="notes" maxLength={1000} placeholder="ملاحظات خاصة (اختياري)" />
      </fieldset>

      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      <button type="submit" className="qd-btn qd-btn-primary" disabled={pending || !canSubmit} style={{ width: "100%" }}>
        {pending ? "جارٍ الحفظ…" : "حفظ الدين"}
      </button>
    </form>
  );
}
