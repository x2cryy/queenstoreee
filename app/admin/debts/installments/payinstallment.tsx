"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "../_ui/Modal";
import { useFormAction } from "../_ui/useFormAction";
import { payInstallmentAction } from "./_actions";
import type { DebtResult } from "../../../../lib/finance/debt-result";
import { PAY_METHODS } from "../../../../lib/finance/types";
import { formatMoney } from "../../../../lib/admin/format";
import { toDigits, todayIQ } from "../../../../lib/finance/debt-labels";

export type PayRow = { id: string; seq: number; due: string; remaining: number };

const num = (v: string) => Number(toDigits(v).replace(/[,\s٬]/g, "")) || 0;

type P = {
  planId: string;
  party: string;
  direction: string;
  rows: PayRow[]; // unpaid installments, sorted by seq
  scheduleId?: string;
  trigger?: string;
  tone?: "ghost" | "primary";
};

export default function PayInstallment(p: P) {
  const label = p.direction === "receivable" ? "استلام دفعة" : "تسديد دفعة";
  const sum = p.rows.reduce((a, r) => a + r.remaining, 0);
  return (
    <Modal trigger={p.trigger ?? label} title={label} tone={p.tone ?? "primary"}>
      {/* key: the form remounts with fresh balances after every refresh */}
      <PayForm key={sum + ":" + (p.scheduleId ?? "")} {...p} label={label} />
    </Modal>
  );
}

function PayForm({ planId, party, direction, rows, scheduleId, label }: P & { label: string }) {
  const router = useRouter();
  const close = useModalClose();
  const { state, pending, onSubmit } = useFormAction<DebtResult>(payInstallmentAction, (r) => {
    if (r.ok) {
      close();
      router.refresh();
    } else if (r.stale) router.refresh();
  });
  const [target, setTarget] = useState(scheduleId ?? "");
  const row = rows.find((r) => r.id === target);
  const total = rows.reduce((a, r) => a + r.remaining, 0);
  const room = target ? (row?.remaining ?? 0) : total;
  const [amount, setAmount] = useState(String(target ? (row?.remaining ?? 0) : (rows[0]?.remaining ?? 0)));
  const n = num(amount);
  const valid = n > 0 && n <= room;

  const alloc: { seq: number; due: string; take: number }[] = [];
  if (valid) {
    if (target && row) alloc.push({ seq: row.seq, due: row.due, take: n });
    else {
      let left = n;
      for (const r of rows) {
        if (left <= 0) break;
        const take = Math.min(left, r.remaining);
        alloc.push({ seq: r.seq, due: r.due, take });
        left -= take;
      }
    }
  }

  function pick(v: string) {
    setTarget(v);
    const r = rows.find((x) => x.id === v);
    setAmount(String(v ? (r?.remaining ?? 0) : (rows[0]?.remaining ?? 0)));
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <input type="hidden" name="plan_id" value={planId} />
      <div className="qd-kv"><span>الطرف</span><b>{party}</b></div>
      <div className="qd-kv"><span>المتبقي على الخطة</span><b>{formatMoney(total)}</b></div>
      {!scheduleId ? (
        <label className="qd-field" style={{ marginTop: 12 }}>الدفعة على
          <select className="qd-input" name="schedule_id" value={target} onChange={(e) => pick(e.target.value)}>
            <option value="">توزيع تلقائي من أقدم قسط</option>
            {rows.slice(0, 60).map((r) => (
              <option key={r.id} value={r.id}>قسط {r.seq} · {r.due} · متبقي {formatMoney(r.remaining)}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <input type="hidden" name="schedule_id" value={target} />
          {row ? <div className="qd-kv"><span>القسط {row.seq}</span><b>{formatMoney(row.remaining)}</b></div> : null}
        </>
      )}
      <div className="qd-grid2" style={{ marginTop: 12 }}>
        <label className="qd-field">{direction === "receivable" ? "المبلغ المستلم (د.ع)" : "المبلغ المسدد (د.ع)"}
          <input className="qd-input" name="amount" inputMode="numeric" dir="ltr" autoComplete="off" value={amount} onChange={(e) => setAmount(toDigits(e.target.value))} />
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

      {n > room ? (<div className="qd-msg" data-tone="err" role="alert">المبلغ أكبر من المتبقي ({formatMoney(room)}).</div>) : null}
      {alloc.length > 0 ? (
        <div className="qd-card" style={{ marginTop: 12 }}>
          <h2>{alloc.length > 1 ? "سيُوزَّع المبلغ على أكثر من قسط" : "التوزيع"}</h2>
          {alloc.slice(0, 8).map((a) => (
            <div className="qd-kv" key={a.seq}><span>قسط {a.seq} · {a.due}</span><b>{formatMoney(a.take)}</b></div>
          ))}
          {alloc.length > 8 ? <p className="qd-hint">و{alloc.length - 8} أقساط أخرى.</p> : null}
        </div>
      ) : null}
      {valid ? (<p className="qd-hint">المتبقي على الخطة بعد الدفعة: {formatMoney(total - n)}</p>) : null}
      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      <button type="submit" className="qd-btn qd-btn-primary" disabled={pending || !valid} style={{ width: "100%", marginTop: 12 }}>
        {pending ? "جارٍ الحفظ…" : label === "استلام دفعة" ? "تأكيد الاستلام" : "تأكيد التسديد"}
      </button>
    </form>
  );
}
