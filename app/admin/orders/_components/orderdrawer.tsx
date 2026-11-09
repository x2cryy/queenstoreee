"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, Phone, UserRound, X } from "lucide-react";
import { formatDateTime, formatMoney } from "../../../../lib/admin/format";
import OrderActions from "./OrderActions";

export type OrderDrawerData = {
  order: {
    id: string; order_number: string; customer_id: string | null; customer_name: string; phone: string;
    governorate: string | null; area: string | null; address: string | null; landmark: string | null;
    notes: string | null; delivery_notes: string | null; coupon_code: string | null;
    subtotal: number; discount_total: number; delivery_fee: number; total: number;
    payment_method: string | null; payment_status: string; status: string;
    created_at: string; delivered_at: string | null; cancel_reason: string | null; return_reason: string | null;
    status_label: string; pay_label: string;
  };
  items: { id: string; product_name: string; variant_label: string | null; sku: string | null; unit_price: number; quantity: number; line_total: number }[];
  payments: { id: string; payment_number: string | null; method: string; amount: number; status: string; created_at: string }[];
  history: { id: string; from_label: string | null; to_label: string; note: string | null; created_at: string }[];
  debt: { id: string; original_amount: number; paid_amount: number; status: string; due_date: string | null } | null;
  room: number;
  canDebt: boolean;
  notes: { id: string; body: string; created_at: string }[];
};

const METHOD: Record<string, string> = { cod: "الدفع عند الاستلام", cash: "نقدي", card: "بطاقة", transfer: "تحويل" };
const PAY: Record<string, string> = {
  pending: "قيد الانتظار", submitted: "بانتظار المراجعة", approved: "مقبول", paid: "مدفوع",
  rejected: "مرفوض", failed: "فشل", refunded: "مسترجع",
};

const card: CSSProperties = {
  border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 12, padding: 14,
  background: "var(--c-surface, #fff)", minWidth: 0,
};

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-line-soft, #F1ECE2)", fontSize: 14 }}>
      <span style={{ color: "var(--c-muted, #6B6458)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "end", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <div style={{ fontWeight: 700, marginBottom: 8 }}>{children}</div>;
}

export function OrderDrawer({ data, closeHref }: { data: OrderDrawerData; closeHref: string }) {
  const router = useRouter();
  const o = data.order;
  const close = () => router.push(closeHref, { scroll: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  const pieces = data.items.reduce((n, i) => n + (Number(i.quantity) || 0), 0);
  const place = [o.governorate, o.area, o.address, o.landmark].filter(Boolean).join(" - ");

  return (
    <>
      <motion.div
        onClick={close}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 60 }}
      />
      <motion.aside
        role="dialog"
        aria-label={"تفاصيل الطلب " + o.order_number}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: "min(500px, 100vw)", zIndex: 61,
          background: "var(--c-bg-soft, #FAF8F3)", color: "var(--c-text, #17140F)",
          display: "flex", flexDirection: "column", boxShadow: "0 0 30px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderBottom: "1px solid var(--c-line, #ECE6DA)", background: "var(--c-surface, #fff)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div dir="ltr" style={{ fontWeight: 700, fontSize: 16, textAlign: "start" }}>{o.order_number}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              <span className={"ao-badge ao-st-" + o.status}>{o.status_label}</span>
              <span className={"ao-badge ao-pay-" + o.payment_status}>{o.pay_label}</span>
            </div>
          </div>
          <Link className="ds-btn" href={"/admin/orders/" + o.id} aria-label="فتح الطلب الكامل"><ExternalLink size={16} /> الطلب الكامل</Link>
          <button type="button" className="ds-btn" onClick={close} aria-label="إغلاق"><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 14, display: "grid", gap: 12, alignContent: "start" }}>
          <OrderActions data={data} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="ds-kpi"><span className="ds-kpi-label">الإجمالي</span><span className="ds-kpi-value">{formatMoney(Number(o.total) || 0)}</span></div>
            <div className="ds-kpi"><span className="ds-kpi-label">عدد القطع</span><span className="ds-kpi-value">{pieces}</span><span className="ds-kpi-hint">{data.items.length} صنف</span></div>
          </div>

          <div style={card}>
            <Title>الزبون</Title>
            <Line label="الاسم">
              {o.customer_id ? (
                <Link href={"/admin/customers/" + o.customer_id} style={{ color: "inherit", display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <UserRound size={14} /> {o.customer_name}
                </Link>
              ) : o.customer_name}
            </Line>
            <Line label="الهاتف">
              <a href={"tel:" + o.phone} dir="ltr" style={{ color: "inherit", display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Phone size={14} /> {o.phone}
              </a>
            </Line>
            <Line label="العنوان">{place || "-"}</Line>
            {o.notes ? <Line label="ملاحظات الزبون">{o.notes}</Line> : null}
            {o.delivery_notes ? <Line label="ملاحظات التوصيل">{o.delivery_notes}</Line> : null}
          </div>

          <div style={card}>
            <Title>المنتجات</Title>
            {data.items.length === 0 ? (
              <div className="ds-empty">لا توجد منتجات في هذا الطلب.</div>
            ) : (
              data.items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--c-line-soft, #F1ECE2)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{i.product_name}</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted2, #8A8372)", overflowWrap: "anywhere" }}>
                      {[i.variant_label, i.sku].filter(Boolean).join(" - ")}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--c-muted, #6B6458)" }}>{i.quantity} x {formatMoney(Number(i.unit_price) || 0)}</div>
                  </div>
                  <strong style={{ flexShrink: 0 }}>{formatMoney(Number(i.line_total) || 0)}</strong>
                </div>
              ))
            )}
          </div>

          <div style={card}>
            <Title>المبلغ والدفع</Title>
            <Line label="المجموع الفرعي">{formatMoney(Number(o.subtotal) || 0)}</Line>
            {Number(o.discount_total) > 0 ? <Line label={"الخصم" + (o.coupon_code ? " (" + o.coupon_code + ")" : "")}>{"-" + formatMoney(Number(o.discount_total))}</Line> : null}
            <Line label="التوصيل">{formatMoney(Number(o.delivery_fee) || 0)}</Line>
            <Line label="الإجمالي">{formatMoney(Number(o.total) || 0)}</Line>
            <Line label="طريقة الدفع">{o.payment_method ? METHOD[o.payment_method] ?? o.payment_method : "-"}</Line>
            {data.payments.length > 0 ? (
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {data.payments.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: 8, borderRadius: 8, background: "var(--c-bg-soft2, #F5F1E8)" }}>
                    <span dir="ltr">{p.payment_number ?? "-"}</span>
                    <span>{PAY[p.status] ?? p.status}</span>
                    <strong>{formatMoney(Number(p.amount) || 0)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {o.cancel_reason || o.return_reason ? (
            <div style={card}>
              {o.cancel_reason ? <Line label="سبب الإلغاء">{o.cancel_reason}</Line> : null}
              {o.return_reason ? <Line label="سبب الإرجاع">{o.return_reason}</Line> : null}
            </div>
          ) : null}

          <div style={card}>
            <Title>سجل الحالة</Title>
            <Line label="تاريخ الطلب">{formatDateTime(o.created_at)}</Line>
            {o.delivered_at ? <Line label="تاريخ التسليم">{formatDateTime(o.delivered_at)}</Line> : null}
            {data.history.map((h) => (
              <div key={h.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--c-line-soft, #F1ECE2)", fontSize: 14 }}>
                <div style={{ fontWeight: 600 }}>{h.from_label ? h.from_label + " ← " : ""}{h.to_label}</div>
                {h.note ? <div style={{ color: "var(--c-muted, #6B6458)", overflowWrap: "anywhere" }}>{h.note}</div> : null}
                <div style={{ fontSize: 12, color: "var(--c-muted2, #8A8372)" }}>{formatDateTime(h.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
