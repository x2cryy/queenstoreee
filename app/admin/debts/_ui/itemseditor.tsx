"use client";

import { useEffect, useState } from "react";
import { toDigits } from "../../../../lib/finance/debt-labels";
import { formatMoney } from "../../../../lib/admin/format";

type Row = { name: string; qty: string; price: string };
const MAX_ROWS = 30;
const num = (v: string) => Number(toDigits(v).replace(/[,\s.]/g, "")) || 0;

export default function ItemsEditor({ onTotal }: { onTotal?: (total: number) => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ name: "", qty: "1", price: "" }]);

  const clean = rows
    .map((r) => ({ name: r.name.trim().slice(0, 120), qty: num(r.qty), price: num(r.price) }))
    .filter((r) => r.name && r.qty > 0)
    .map((r) => ({ ...r, total: r.qty * r.price }));
  const sum = clean.reduce((a, r) => a + r.total, 0);

  useEffect(() => {
    if (open && sum > 0 && onTotal) onTotal(sum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sum]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  if (!open) {
    return (
      <div style={{ marginTop: 10 }}>
        <button type="button" className="ds-btn" onClick={() => setOpen(true)}>
          + إضافة تفاصيل الأغراض (اختياري)
        </button>
      </div>
    );
  }

  return (
    <fieldset className="qd-sec">
      <legend>تفاصيل الأغراض (اختياري)</legend>
      <input type="hidden" name="items" value={clean.length ? JSON.stringify(clean) : ""} />
      {rows.map((r, i) => {
        const line = num(r.qty) * num(r.price);
        return (
          <div key={i} className="qd-card" style={{ marginTop: i ? 10 : 0 }}>
            <label className="qd-field">
              المادة أو الوصف
              <input className="qd-input" value={r.name} maxLength={120} autoComplete="off"
                onChange={(e) => setRow(i, { name: e.target.value })} />
            </label>
            <div className="qd-grid2" style={{ marginTop: 8 }}>
              <label className="qd-field">
                الكمية
                <input className="qd-input" inputMode="numeric" dir="ltr" autoComplete="off" value={r.qty}
                  onChange={(e) => setRow(i, { qty: toDigits(e.target.value) })} />
              </label>
              <label className="qd-field">
                سعر الوحدة (د.ع)
                <input className="qd-input" inputMode="numeric" dir="ltr" autoComplete="off" value={r.price}
                  onChange={(e) => setRow(i, { price: toDigits(e.target.value) })} />
              </label>
            </div>
            <p className="qd-hint">
              الإجمالي: {formatMoney(line)}{" "}
              {rows.length > 1 ? (
                <button type="button" className="ds-btn" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                  حذف
                </button>
              ) : null}
            </p>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {rows.length < MAX_ROWS ? (
          <button type="button" className="ds-btn" onClick={() => setRows((rs) => [...rs, { name: "", qty: "1", price: "" }])}>
            + غرض آخر
          </button>
        ) : null}
        <button type="button" className="ds-btn" onClick={() => setOpen(false)}>
          إخفاء التفاصيل
        </button>
      </div>
      <p className="qd-hint">إجمالي الأغراض: {formatMoney(sum)}. يُحسب المبلغ الإجمالي أعلاه تلقائياً من هذا المجموع.</p>
    </fieldset>
  );
}
