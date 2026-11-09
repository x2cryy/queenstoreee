import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../lib/auth/session";
import { createClient } from "../../../../lib/supabase/server";
import { formatDateTime, formatMoney } from "../../../../lib/admin/format";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  statusLabel,
} from "../../../../lib/shop/orders";
import PrintButton from "./PrintButton";
import ReceiptShare from "./ReceiptShare";
import "../../../_styles/queen-print.css";

export const metadata: Metadata = { title: "طباعة الطلب", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ord = {
  order_number: string;
  created_at: string;
  status: string;
  customer_name: string;
  phone: string;
  governorate: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  notes: string | null;
  delivery_notes: string | null;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
};
type Item = {
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requirePermission("orders", `/print/order/${id}`);

  const supabase = await createClient();
  const [oRes, iRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "order_number, created_at, status, customer_name, phone, governorate, area, address, landmark, notes, delivery_notes, subtotal, discount_total, delivery_fee, total, payment_method, payment_status"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select("product_name, variant_label, sku, unit_price, quantity, line_total")
      .eq("order_id", id)
      .order("product_name"),
  ]);
  if (!oRes.data) notFound();
  const o = oRes.data as unknown as Ord;
  const items = (iRes.data ?? []) as unknown as Item[];
  const place = [o.governorate, o.area].filter(Boolean).join("، ");
  const { data: payRows } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("order_id", id);
  const paidSum = ((payRows ?? []) as { amount: number; status: string }[])
    .filter((r) => r.status === "succeeded")
    .reduce((n, r) => n + (Number(r.amount) || 0), 0);
  const remainingSum = Math.max(0, (Number(o.total) || 0) - paidSum);
  const closedOrder = o.status === "cancelled" || o.status === "returned";
  const { data: qiRowsRaw } = await supabase
    .from("payments")
    .select("provider_reference, status")
    .eq("order_id", id)
    .eq("method", "qi_card");
  const qiRows = (qiRowsRaw ?? []) as { provider_reference: string | null; status: string }[];
  const qiPay = qiRows.find((r) => r.status === "succeeded") ?? qiRows[qiRows.length - 1] ?? null;

  return (
    <div className="qp" dir="rtl" lang="ar">
      <div className="qp-bar qp-noprint">
        <PrintButton />
          <ReceiptShare
            data={{
              number: o.order_number,
              date: formatDateTime(o.created_at),
              status: statusLabel(o.status),
              customer: o.customer_name,
              phone: o.phone,
              place,
              address: o.address ?? "",
              items: items.map((it) => ({
                name: it.product_name + (it.variant_label ? " (" + it.variant_label + ")" : ""),
                qty: it.quantity,
                price: formatMoney(Number(it.unit_price) || 0),
                total: formatMoney(Number(it.line_total) || 0),
              })),
              subtotal: formatMoney(Number(o.subtotal) || 0),
              discount: Number(o.discount_total) > 0 ? formatMoney(Number(o.discount_total)) : "",
              delivery: Number(o.delivery_fee) > 0 ? formatMoney(Number(o.delivery_fee)) : "",
              total: formatMoney(Number(o.total) || 0),
              paid: formatMoney(paidSum),
              remaining: closedOrder ? "" : formatMoney(remainingSum),
              payLabel: PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method,
              payStatus: PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status,
              paidN: paidSum,
              remN: remainingSum,
              closed: closedOrder,
            }}
          />
      </div>
      <div className="qp-top">
        <div>
          <h1 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><img src="/brand/q-mark.svg" alt="" style={{ height: 32, width: "auto" }} />QUEEN STORE</h1>
          <p style={{ margin: 0 }}>فاتورة طلب</p>
        </div>
        <div style={{ textAlign: "end" }}>
          <strong dir="ltr">{o.order_number}</strong>
          <p style={{ margin: 0 }}>{formatDateTime(o.created_at)}</p>
          <p style={{ margin: 0 }}>{statusLabel(o.status)}</p>
        </div>
      </div>

      <h2>بيانات الزبون</h2>
      <dl className="qp-kv">
        <dt>الاسم</dt>
        <dd>{o.customer_name}</dd>
        <dt>الهاتف</dt>
        <dd dir="ltr" style={{ textAlign: "start" }}>
          {o.phone}
        </dd>
        {place ? (
          <>
            <dt>المنطقة</dt>
            <dd>{place}</dd>
          </>
        ) : null}
        {o.address ? (
          <>
            <dt>العنوان</dt>
            <dd>{o.address}</dd>
          </>
        ) : null}
        {o.landmark ? (
          <>
            <dt>أقرب نقطة دالة</dt>
            <dd>{o.landmark}</dd>
          </>
        ) : null}
        {o.notes ? (
          <>
            <dt>ملاحظات الزبون</dt>
            <dd>{o.notes}</dd>
          </>
        ) : null}
        {o.delivery_notes ? (
          <>
            <dt>ملاحظات التوصيل</dt>
            <dd>{o.delivery_notes}</dd>
          </>
        ) : null}
      </dl>

      <h2>المنتجات</h2>
      <table className="qp-table">
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={`${it.product_name}-${i}`}>
              <td>
                {it.product_name}
                {it.variant_label ? ` (${it.variant_label})` : ""}
                {it.sku ? ` - ${it.sku}` : ""}
              </td>
              <td>{it.quantity}</td>
              <td>{formatMoney(Number(it.unit_price) || 0)}</td>
              <td>{formatMoney(Number(it.line_total) || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="qp-sum">
        <div>
          <span>المجموع الفرعي</span>
          <span>{formatMoney(Number(o.subtotal) || 0)}</span>
        </div>
        {Number(o.discount_total) > 0 ? (
          <div>
            <span>الخصم</span>
            <span>-{formatMoney(Number(o.discount_total))}</span>
          </div>
        ) : null}
        <div>
          <span>التوصيل</span>
          <span>{formatMoney(Number(o.delivery_fee) || 0)}</span>
        </div>
        <div className="t">
          <span>الإجمالي</span>
          <span>{formatMoney(Number(o.total) || 0)}</span>
        </div>
      </div>
      <div className="qp-sum">
        <div>
          <span>المدفوع</span>
          <span>{formatMoney(paidSum)}</span>
        </div>
        {closedOrder ? null : (
          <div>
            <span>المتبقي</span>
            <span>{formatMoney(remainingSum)}</span>
          </div>
        )}
      </div>
      <p style={{ marginTop: 12 }}>
        الدفع: {PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method} (
        {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status})
      </p>
        {qiPay?.provider_reference ? (
          <p style={{ margin: 0 }}>
            مرجع التحويل: <span dir="ltr">{qiPay.provider_reference}</span>
          </p>
        ) : null}
    </div>
  );
}
