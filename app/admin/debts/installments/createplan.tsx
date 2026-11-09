"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "../_ui/Modal";
import { useFormAction } from "../_ui/useFormAction";
import { createPlanAction } from "./_actions";
import type { DebtResult } from "../../../../lib/finance/debt-result";
import { PAY_METHODS } from "../../../../lib/finance/types";
import { formatMoney } from "../../../../lib/admin/format";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";
import { FREQ_LABEL, buildSchedule, type Freq } from "../../../../lib/finance/schedule";

type Cust = { id: string; full_name: string; phone: string | null };

const num = (v: string) => Number(toDigits(v).replace(/[,\s٬]/g, "")) || 0;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function CreatePlan({ customers, isOwner }: { customers: Cust[]; isOwner: boolean }) {
  return (
    <Modal trigger="إنشاء خطة أقساط" title="إنشاء خطة أقساط" tone="primary">
      <PlanForm customers={customers} isOwner={isOwner} />
    </Modal>
  );
}

function PlanForm({ customers, isOwner }: { customers: Cust[]; isOwner: boolean }) {
  const router = useRouter();
  const close = useModalClose();
  const { state, pending, onSubmit } = useFormAction<DebtResult>(createPlanAction, (r) => {
    if (r.ok && r.id) {
      close();
      router.push("/admin/debts/installments/" + r.id);
    }
  });
  const [scope, setScope] = useState(isOwner ? "" : "store");
  const [dir, setDir] = useState("");
  const [customer, setCustomer] = useState("");
  const [party, setParty] = useState("");
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [down, setDown] = useState("");
  const [count, setCount] = useState("");
  const [start, setStart] = useState(todayIQ());
  const [freq, setFreq] = useState<Freq>("monthly");

  const totalN = num(total);
  const downN = num(down);
  const countN = num(count);
  const preview = DATE.test(start) ? buildSchedule(totalN, downN, countN, start, freq) : [];
  const canSubmit =
    !!scope && !!dir && title.trim().length > 0 && (party.trim().length > 0 || !!customer) &&
    totalN > 0 && downN >= 0 && downN < totalN && preview.length > 0;
  const lastDiffers = preview.length > 1 && preview[preview.length - 1].amount !== preview[0].amount;
  const monthEnd = freq === "monthly" && DATE.test(start) && Number(start.slice(8, 10)) > 28;
  const shown =
    preview.length <= 12
      ? preview.map((r) => ({ ...r, gap: false }))
      : [...preview.slice(0, 6).map((r) => ({ ...r, gap: false })), { seq: 0, due: "", amount: 0, gap: true }, ...preview.slice(-3).map((r) => ({ ...r, gap: false }))];

  const dirLabels = scope === "personal" ? ["لي: مبلغ مستحق لي", "عليّ: مبلغ مستحق عليّ"] : ["للمتجر: مبلغ مستحق للمتجر", "على المتجر: مبلغ مستحق على المتجر"];

  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset className="qd-sec">
        <legend>1. النطاق والاتجاه</legend>
        {isOwner ? (
          <div className="qd-grid2">
            <label className="qd-choice">
              <input type="radio" name="scope" value="store" checked={scope === "store"} onChange={() => setScope("store")} />
              <span>متجر</span>
            </label>
            <label className="qd-choice">
              <input type="radio" name="scope" value="personal" checked={scope === "personal"} onChange={() => { setScope("personal"); setCustomer(""); }} />
              <span>شخصي (خاص بك)</span>
            </label>
          </div>
        ) : (
          <input type="hidden" name="scope" value="store" />
        )}
        <div className="qd-grid2" style={{ marginTop: 10 }}>
          <label className="qd-choice">
            <input type="radio" name="direction" value="receivable" checked={dir === "receivable"} onChange={() => setDir("receivable")} />
            <span>{dirLabels[0]}</span>
          </label>
          <label className="qd-choice">
            <input type="radio" name="direction" value="payable" checked={dir === "payable"} onChange={() => setDir("payable")} />
            <span>{dirLabels[1]}</span>
          </label>
        </div>
        <p className="qd-hint">النطاق والاتجاه لا يتغيران بعد الحفظ. الخطة الشخصية لا تظهر في ملف أي عميل ولا في حسابات المتجر.</p>
      </fieldset>

      <fieldset className="qd-sec">
        <legend>2. الطرف والسبب</legend>
        {scope === "store" ? (
          <label className="qd-field">عميل مسجل (اختياري)
            <select className="qd-input" name="customer" value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="">بدون ربط بعميل</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.full_name}{c.phone ? " - " + c.phone : ""}</option>))}
            </select>
          </label>
        ) : null}
        <label className="qd-field" style={{ marginTop: 10 }}>{customer ? "اسم الطرف (اختياري، يؤخذ من العميل)" : "اسم الطرف"}
          <input className="qd-input" name="party" maxLength={120} autoComplete="off" value={party} onChange={(e) => setParty(e.target.value)} />
        </label>
        <label className="qd-field" style={{ marginTop: 10 }}>عنوان الخطة أو سببها
          <input className="qd-input" name="title" maxLength={200} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </fieldset>

      <fieldset className="qd-sec">
        <legend>3. المبلغ والأقساط</legend>
        <div className="qd-grid2">
          <label className="qd-field">المبلغ الكلي (د.ع)
            <input className="qd-input" name="total" inputMode="numeric" dir="ltr" autoComplete="off" value={total} onChange={(e) => setTotal(toDigits(e.target.value))} />
          </label>
          <label className="qd-field">دفعة مقدمة (اختياري)
            <input className="qd-input" name="down" inputMode="numeric" dir="ltr" autoComplete="off" value={down} onChange={(e) => setDown(toDigits(e.target.value))} />
          </label>
          <label className="qd-field">عدد الأقساط
            <input className="qd-input" name="count" inputMode="numeric" dir="ltr" autoComplete="off" value={count} onChange={(e) => setCount(toDigits(e.target.value))} />
          </label>
          <label className="qd-field">التكرار
            <select className="qd-input" name="frequency" value={freq} onChange={(e) => setFreq(e.target.value as Freq)}>
              {Object.entries(FREQ_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </label>
          <label className="qd-field">تاريخ أول استحقاق
            <input className="qd-input" type="date" name="start" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        </div>
        {downN >= totalN && totalN > 0 ? (<div className="qd-msg" data-tone="err" role="alert">الدفعة المقدمة يجب أن تقل عن المبلغ الكلي.</div>) : null}
        {downN > 0 && downN < totalN ? (
          <div className="qd-grid2" style={{ marginTop: 10 }}>
            <label className="qd-field">طريقة دفع المقدمة
              <select className="qd-input" name="down_method" defaultValue="cash">
                {PAY_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </label>
            <label className="qd-field">مرجع المقدمة (اختياري)
              <input className="qd-input" name="down_ref" maxLength={120} />
            </label>
          </div>
        ) : null}
        {downN > 0 ? <p className="qd-hint">الدفعة المقدمة تُسجَّل مرة واحدة بوصل مستقل عند الحفظ ولا تُعكس من هنا. المتبقي للأقساط: {formatMoney(Math.max(0, totalN - downN))}</p> : null}
      </fieldset>

      {preview.length > 0 ? (
        <fieldset className="qd-sec">
          <legend>معاينة جدول الأقساط ({preview.length})</legend>
          <div className="qd-card">
            {shown.map((r, i) =>
              r.gap ? (
                <div className="qd-pay" key={"gap" + i}><span className="qd-sub">…</span></div>
              ) : (
                <div className="qd-pay" key={r.seq}>
                  <div className="qd-pay-top"><span>القسط {r.seq} · {r.due}</span><b>{formatMoney(r.amount)}</b></div>
                </div>
              ),
            )}
          </div>
          {lastDiffers ? <p className="qd-hint">القسط الأخير يستوعب فرق التقريب حتى يطابق مجموع الأقساط المبلغ المتبقي بعد المقدمة.</p> : null}
          {monthEnd ? <p className="qd-hint">إذا لم يحتوِ الشهر على يوم الاستحقاق نفسه يُستحق القسط في آخر يوم من ذلك الشهر.</p> : null}
          <p className="qd-hint">لا فوائد ولا غرامات تُضاف تلقائيًا.</p>
        </fieldset>
      ) : null}

      <fieldset className="qd-sec">
        <legend>4. ملاحظات</legend>
        <textarea className="qd-input" name="notes" maxLength={1000} placeholder="ملاحظات (اختياري)" />
      </fieldset>

      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      <button type="submit" className="qd-btn qd-btn-primary" disabled={pending || !canSubmit} style={{ width: "100%" }}>
        {pending ? "جارٍ الحفظ…" : "حفظ الخطة"}
      </button>
    </form>
  );
}
