"use client";

import { useState } from "react";
import { waNumber } from "../../../lib/admin/orders";

export default function OrderShare({
  orderId,
  phone,
  summary,
}: {
  orderId: string;
  phone: string;
  summary: string;
}) {
  const [msg, setMsg] = useState("");
  const to = waNumber(phone);
  const text = encodeURIComponent(summary);
  const wa = to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setMsg("تم نسخ الملخص");
    } catch {
      setMsg("تعذر النسخ");
    }
    window.setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div>
      <div className="ao-actions">
        <button type="button" className="ao-btn ao-btn-line" onClick={copy}>
          نسخ ملخص واتساب
        </button>
        <a className="ao-btn ao-btn-line" href={wa} target="_blank" rel="noopener noreferrer">
          {to ? "مراسلة الزبون عبر واتساب" : "مشاركة عبر واتساب"}
        </a>
        <a
          className="ao-btn ao-btn-line"
          href={`/print/order/${orderId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          طباعة الطلب
        </a>
      </div>
      <p className="ao-muted" role="status" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}
