"use client";

import type { OrderDrawerData } from "./OrderDrawer";
import {
  DeliveryForm,
  NoteForm,
  PaymentForm,
  StatusForm,
} from "../../_components/OrderForms";
import OrderShare from "../../_components/OrderShare";
import SaveAsDebt from "./SaveAsDebt";
import { DELIVERY_EDITABLE, whatsappSummary } from "../../../../lib/admin/orders";
import { formatDateTime, formatMoney } from "../../../../lib/admin/format";

export default function OrderActions({ data }: { data: OrderDrawerData }) {
  const o = data.order;
  const total = Number(o.total) || 0;
  const paid = data.payments
    .filter((p) => p.status === "succeeded")
    .reduce((n, p) => n + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, total - paid);
  const closed = o.status === "cancelled" || o.status === "returned";
  const summary = whatsappSummary({
    order_number: o.order_number,
    status: o.status,
    customer_name: o.customer_name,
    phone: o.phone,
    governorate: o.governorate,
    area: o.area,
    address: o.address,
    landmark: o.landmark,
    total,
    payment_method: o.payment_method ?? "",
    payment_status: o.payment_status,
    items: data.items,
      discount_total: Number(o.discount_total) || 0,
      delivery_fee: Number(o.delivery_fee) || 0,
      paid,
      remaining: closed ? undefined : remaining,
  });

  return (
    <>
      <div className="ao-card">
        <h2>تغيير حالة الطلب</h2>
        <StatusForm key={o.status} orderId={o.id} current={o.status} />
      </div>

      <div className="ao-card">
        <h2>الدفع</h2>
        <div className="ao-sum">
          <span>المدفوع</span>
          <span>{formatMoney(paid)}</span>
        </div>
        <div className="ao-sum">
          <span>المتبقي</span>
          <span>{formatMoney(remaining)}</span>
        </div>
        {closed ? (
          <p className="ao-muted">الطلب مغلق، لا يمكن تسجيل دفعات عليه.</p>
        ) : (
          <details>
            <summary>تسجيل دفعة</summary>
            <PaymentForm orderId={o.id} remaining={Math.min(remaining, Math.max(0, data.room))} />
          </details>
        )}
      </div>

      <SaveAsDebt data={data} />

        {DELIVERY_EDITABLE.includes(o.status) ? (
        <details className="ao-card">
          <summary>تعديل التوصيل</summary>
          <DeliveryForm
            orderId={o.id}
            fee={Number(o.delivery_fee) || 0}
            notes={o.delivery_notes ?? ""}
          />
        </details>
      ) : null}

      <details className="ao-card">
        <summary>ملاحظة داخلية</summary>
        <NoteForm orderId={o.id} />
          {data.notes.length > 0 ? (
            <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
              {data.notes.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: "8px 0",
                    borderTop: "1px solid var(--c-line-soft, #F1ECE2)",
                    fontSize: 14,
                    overflowWrap: "anywhere",
                  }}
                >
                  <div>{n.body}</div>
                  <small style={{ color: "var(--c-muted, #6B6458)" }}>{formatDateTime(n.created_at)}</small>
                </li>
              ))}
            </ul>
          ) : null}
      </details>

      <details className="ao-card">
        <summary>مشاركة الطلب وطباعة الوصل</summary>
        <OrderShare orderId={o.id} phone={o.phone} summary={summary} />
      </details>
    </>
  );
}
