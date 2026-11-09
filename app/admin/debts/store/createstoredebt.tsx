"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "../_ui/Modal";
import { useFormAction } from "../_ui/useFormAction";
import { createStoreDebtAction } from "./_actions";
import type { DebtResult } from "../../../../lib/finance/debt-result";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";
import ItemsEditor from "../_ui/ItemsEditor";

type Cust = { id: string; full_name: string; phone: string | null };
const num = (v: string) => Number(toDigits(v).replace(/[,\s٬]/g, "")) || 0;

export default function CreateStoreDebt({ customers }: { customers: Cust[] }) {
  return (
    <Modal trigger="إنشاء دين" title="إنشاء دين متجر" tone="primary">
      <CreateForm customers={customers} />
    </Modal>
  );
}

function CreateForm({ customers }: { customers: Cust[] }) {
  const router = useRouter();
  const close = useModalClose();
  const [dir, setDir] = useState("");
  const [cust, setCust] = useState("");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [debtDate, setDebtDate] = useState(todayIQ());
  const { state, pending, onSubmit } = useFormAction<DebtResult>(createStoreDebtAction, (r) => {
    if (r.ok && r.id) {
      close();
      router.push("/admin/debts/store/" + r.id);
    }
  });
  const canSubmit = !!dir && num(amount) > 0 && (party.trim().length > 0 || !!cust);

  return (
    <form onSubmit={onSubmit} noValidate>

      <fieldset className="qd-sec">
        <legend>1. النوع والطرف</legend>
        <div className="qd-grid2">
          <label className="qd-choice">
            <input type="radio" name="direction" value="receivable" checked={dir === "receivable"} onChange={() => setDir("receivable")} />
            <span>للمتجر: الطرف مدين للمتجر</span>
          </label>
          <label className="qd-choice">
            <input type="radio" name="direction" value="payable" checked={dir === "payable"} onChange={() => { setDir("payable"); setCust(""); }} />
            <span>على المتجر: المتجر مدين للطرف</span>
          </label>
        </div>
        <p className="qd-hint">النوع لا يمكن تغييره بعد الحفظ. دين الطلب يُنشأ من زر «حفظ كدين» داخل الطلب.</p>
        <div className="qd-grid2" style={{ marginTop: 10 }}>
          <label className="qd-field">اسم الطرف
            <input className="qd-input" name="party" maxLength={120} autoComplete="off" value={party} onChange={(e) => setParty(e.target.value)} />
          </label>
          <label className="qd-field">ربط بعميل مسجل (اختياري، للديون المستحقة للمتجر فقط)
            <select className="qd-input" name="customer" value={cust} onChange={(e) => setCust(e.target.value)} disabled={dir !== "receivable"}>
              <option value="">بدون ربط</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.full_name}{c.phone ? " - " + c.phone : ""}</option>))}
            </select>
          </label>
        </div>
        <p className="qd-hint">إن اخترت عميلًا وتركت الاسم فارغًا يُؤخذ اسمه تلقائيًا. لا يُربط أي سجل بعميل بسبب تشابه الاسم.</p>
        <label className="qd-field" style={{ marginTop: 10 }}>السبب (اختياري)
          <input className="qd-input" name="reason" maxLength={200} />
        </label>
      </fieldset>

      <fieldset className="qd-sec">
        <legend>2. المبلغ</legend>
        <label className="qd-field">المبلغ (د.ع)
          <input className="qd-input" name="amount" inputMode="numeric" dir="ltr" autoComplete="off" value={amount} onChange={(e) => setAmount(toDigits(e.target.value))} required />
        </label>
        <ItemsEditor onTotal={(t) => setAmount(String(t))} />
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
        <textarea className="qd-input" name="notes" maxLength={1000} placeholder="ملاحظات (اختياري)" />
      </fieldset>

      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      <button type="submit" className="qd-btn qd-btn-primary" disabled={pending || !canSubmit} style={{ width: "100%" }}>
        {pending ? "جارٍ الحفظ…" : "حفظ الدين"}
      </button>
    </form>
  );
}
