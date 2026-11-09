"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderDrawerData } from "./OrderDrawer";
import { saveOrderAsDebt } from "./debt-actions";
import { formatMoney } from "../../../../lib/admin/format";

const DEBT_STATUS: Record<string, string> = {
  open: "مفتوح",
  partial: "مسدد جزئياً",
  paid: "مسدد بالكامل",
};
const AR = "٠١٢٣٤٥٦٧٨٩";

function toDigits(v: string) {
  return v.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[^0-9]/g, "");
}

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid var(--c-line, #ECE6DA)",
  background: "transparent",
  color: "inherit",
};
const primary: CSSProperties = {
  background: "var(--c-accent, #B89B6A)",
  color: "#1a1a1a",
  border: "none",
  padding: "12px 16px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 15,
  minHeight: 44,
  cursor: "pointer",
};
const ghost: CSSProperties = {
  background: "transparent",
  color: "inherit",
  border: "1px solid var(--c-line, #ECE6DA)",
  padding: "12px 16px",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 15,
  minHeight: 44,
  cursor: "pointer",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid var(--c-line-soft, #F1ECE2)",
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--c-muted, #6B6458)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "end", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

export default function SaveAsDebt({ data }: { data: OrderDrawerData }) {
  const router = useRouter();
  const o = data.order;
  const total = Number(o.total) || 0;
  const paid = data.payments
    .filter((p) => p.status === "succeeded")
    .reduce((n, p) => n + (Number(p.amount) || 0), 0);
  const due = Math.max(0, total - paid);
  const closed = o.status === "cancelled" || o.status === "returned";

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [idem, setIdem] = useState("");

  if (data.debt) {
    const d = data.debt;
    const left = Math.max(0, d.original_amount - d.paid_amount);
    return (
      <div className="ao-card">
        <h2>الدين المرتبط</h2>
        <div className="ao-sum">
          <span>مبلغ الدين</span>
          <span>{formatMoney(d.original_amount)}</span>
        </div>
        <div className="ao-sum">
          <span>المسدد من الدين</span>
          <span>{formatMoney(d.paid_amount)}</span>
        </div>
        <div className="ao-sum">
          <span>المتبقي من الدين</span>
          <span>{formatMoney(left)}</span>
        </div>
        <p className="ao-muted">حالة الدين: {DEBT_STATUS[d.status] ?? d.status}</p>
        <Link
          href={"/admin/debts/store/" + d.id}
          style={{ ...ghost, display: "inline-block", textDecoration: "none", textAlign: "center" }}
        >
          عرض الدين
        </Link>
      </div>
    );
  }

  if (!data.canDebt || closed || data.room <= 0) return null;

  function openDialog() {
    setAmount(String(data.room));
    setDueDate("");
    setNote("");
    setErr("");
    setIdem(crypto.randomUUID());
    setOpen(true);
  }

  async function submit() {
    if (busy) return;
    const n = Number(toDigits(amount));
    if (!n || n <= 0) {
      setErr("أدخل مبلغاً صحيحاً");
      return;
    }
    if (n > data.room) {
      setErr("المبلغ أكبر من المتاح للدين");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await saveOrderAsDebt({ orderId: o.id, amount: n, due: dueDate, note, idem });
      if (!r.ok) {
        setErr(r.message);
        setBusy(false);
        return;
      }
      setOpen(false);
      setBusy(false);
      router.refresh();
    } catch {
      setErr("تعذّر الحفظ، حاول مرة ثانية");
      setBusy(false);
    }
  }

  return (
    <div className="ao-card">
      <h2>حفظ كدين</h2>
      <p className="ao-muted">
        تسجيل المتبقي على هذا الطلب كدين للمتجر. لا يغيّر حالة التجهيز أو التسليم، ولا يعني قبض المبلغ.
      </p>
      <button type="button" style={primary} onClick={openDialog}>
        حفظ كدين
      </button>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              dir="rtl"
              style={{
                width: "100%",
                maxWidth: 480,
                maxHeight: "90vh",
                overflowY: "auto",
                overflowX: "hidden",
                boxSizing: "border-box",
                background: "var(--c-surface, #fff)",
                color: "var(--c-text, inherit)",
                border: "1px solid var(--c-line, #ECE6DA)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>تأكيد حفظ الطلب كدين</div>
              <Row label="العميل">{o.customer_name}</Row>
              <Row label="رقم الطلب">{o.order_number}</Row>
              <Row label="إجمالي الطلب">{formatMoney(total)}</Row>
              <Row label="المدفوع المسجل">{formatMoney(paid)}</Row>
              <Row label="المتبقي المستحق">{formatMoney(due)}</Row>
              <Row label="الحد الأقصى للدين">{formatMoney(data.room)}</Row>

              <label style={{ display: "block", margin: "12px 0 4px", fontSize: 14 }}>مبلغ الدين المقترح</label>
              <input
                style={input}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(toDigits(e.target.value))}
              />

              <label style={{ display: "block", margin: "12px 0 4px", fontSize: 14 }}>
                تاريخ الاستحقاق (اختياري)
              </label>
              <input style={input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

              <label style={{ display: "block", margin: "12px 0 4px", fontSize: 14 }}>
                ملاحظة داخلية (اختياري)
              </label>
              <textarea
                style={{ ...input, minHeight: 70, resize: "vertical" }}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />

              {err ? (
                <p style={{ color: "#c0392b", fontSize: 14, margin: "10px 0 0" }}>{err}</p>
              ) : null}

              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <button type="button" style={{ ...primary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
                  {busy ? "جارٍ الحفظ" : "تأكيد حفظ كدين"}
                </button>
                <button type="button" style={ghost} disabled={busy} onClick={() => setOpen(false)}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
