"use client";

import { useState } from "react";
import { formatPrice } from "../../lib/shop/format";
import { PAYMENT_METHOD_LABEL, statusLabel, type OrderJson } from "../../lib/shop/orders";

// ملخص للمشاركة بدون الهاتف أو العنوان.
function summary(o: OrderJson): string {
  const lines = [`طلب ${o.order_number} من QUEEN STORE`, `الحالة: ${statusLabel(o.status)}`, ""];
  for (const i of o.items) {
    lines.push(`${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`);
  }
  lines.push("", `الإجمالي: ${formatPrice(o.total)}`);
  lines.push(`الدفع: ${PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method}`);
  return lines.join("\n");
}

export default function OrderActions({ order }: { order: OrderJson }) {
  const [msg, setMsg] = useState("");

  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2500);
  };

  async function copy(t: string, ok: string) {
    try {
      await navigator.clipboard.writeText(t);
      flash(ok);
    } catch {
      flash("تعذر النسخ. انسخ النص يدوياً.");
    }
  }

  async function share() {
    const t = summary(order);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: t });
      } catch {
        /* أغلق المستخدم نافذة المشاركة */
      }
      return;
    }
    await copy(t, "تم نسخ ملخص الطلب");
  }

  return (
    <div className="qo-noprint">
      <div className="qo-actions">
        <button
          type="button"
          className="qo-btn qo-btn-line"
          onClick={() => copy(order.order_number, "تم نسخ رقم الطلب")}
        >
          نسخ رقم الطلب
        </button>
        <button type="button" className="qo-btn qo-btn-line" onClick={share}>
          مشاركة الملخص
        </button>
        <button type="button" className="qo-btn qo-btn-line" onClick={() => window.print()}>
          طباعة
        </button>
      </div>
      <p className="qo-hint" style={{ marginTop: 8 }} role="status" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}
