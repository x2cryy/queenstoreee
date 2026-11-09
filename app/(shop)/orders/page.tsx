import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "../../../lib/auth/session";
import { createClient } from "../../../lib/supabase/server";
import { formatPrice } from "../../../lib/shop/format";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  formatOrderDate,
  statusLabel,
} from "../../../lib/shop/orders";

export const metadata: Metadata = { title: "طلباتي", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  order_number: string;
  public_token: string;
  created_at: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  order_items: { product_name: string; variant_label: string | null; quantity: number }[] | null;
};

function summarize(items: Row["order_items"]): string {
  const names = (items ?? []).map((i) => i.product_name);
  if (names.length === 0) return "";
  if (names.length <= 2) return names.join("، ");
  return `${names.slice(0, 2).join("، ")} و${names.length - 2} أخرى`;
}

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, public_token, created_at, status, payment_status, payment_method, total, order_items(product_name, variant_label, quantity)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="qm-wrap qo-page">
      <div className="qm-pagehead">
        <h1>طلباتي</h1>
      </div>
      {error ? (
        <div className="qm-empty">
          <h2>تعذر تحميل طلباتك</h2>
          <p>حاول مجدداً بعد قليل.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="qm-empty">
          <h2>لا توجد طلبات بعد</h2>
          <p>ستظهر هنا طلباتك بعد إتمام أول عملية شراء.</p>
          <Link href="/products" className="qm-btn qm-btn-gold" style={{ marginTop: 18 }}>
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <ul className="qo-orders">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.payment_method === "qi_card" && r.payment_status !== "paid" ? `/order/${r.public_token}/pay` : `/order/${r.public_token}`} className="qo-oc">
                <div className="qo-oc-top">
                  <strong dir="ltr">{r.order_number}</strong>
                  <span className={`qo-badge qo-st-${r.status}`}>{statusLabel(r.status)}</span>
                </div>
                <p className="qo-hint">{formatOrderDate(r.created_at)}</p>
                <p>{summarize(r.order_items)}</p>
                <p>
                  <strong>{formatPrice(Number(r.total) || 0)}</strong>
                </p>
                <p className="qo-hint">
                  {PAYMENT_METHOD_LABEL[r.payment_method] ?? r.payment_method} ·{" "}
                  {PAYMENT_STATUS_LABEL[r.payment_status] ?? r.payment_status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="qo-hint qo-foot">
        طلبت كزائر قبل تسجيل الدخول؟ <Link href="/track">تتبع طلبك برقم الطلب والهاتف</Link>
      </p>
    </div>
  );
}
