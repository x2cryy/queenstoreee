import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { createClient } from "../../../../lib/supabase/server";
import { formatDateTime, formatMoney } from "../../../../lib/admin/format";
import { DELIVERY_EDITABLE, whatsappSummary } from "../../../../lib/admin/orders";
import { publicImageUrl } from "../../../../lib/shop/images";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  statusLabel,
} from "../../../../lib/shop/orders";
import { DeliveryForm, NoteForm, PaymentForm, StatusForm } from "../../_components/OrderForms";
import OrderShare from "../../_components/OrderShare";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ord = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  phone: string;
  governorate: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  notes: string | null;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  cancel_reason: string | null;
  return_reason: string | null;
  delivery_notes: string | null;
  stock_restored_at: string | null;
};
type Item = {
  id: string;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  image_path: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};
type Note = { id: string; body: string; created_by: string | null; created_at: string };
type Hist = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

const PAY_ST: Record<string, string> = {
  succeeded: "ناجحة",
  refunded: "مستردة",
  failed: "فاشلة",
  pending: "معلقة",
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission(["orders"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [oRes, iRes, nRes, hRes, pRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("order_items")
      .select("id, product_name, variant_label, sku, image_path, unit_price, quantity, line_total")
      .eq("order_id", id)
      .order("product_name"),
    supabase
      .from("order_notes")
      .select("id, body, created_by, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_status_history")
      .select("id, from_status, to_status, changed_by, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("payments").select("*").eq("order_id", id),
  ]);
  if (!oRes.data) notFound();

  const o = oRes.data as unknown as Ord;
  const items = (iRes.data ?? []) as unknown as Item[];
  const notes = (nRes.data ?? []) as unknown as Note[];
  const hist = (hRes.data ?? []) as unknown as Hist[];
  const pays = ((pRes.data ?? []) as unknown as Record<string, unknown>[])
    .map((p) => ({
      id: String(p.id ?? ""),
      method: String(p.method ?? ""),
      amount: Number(p.amount) || 0,
      status: String(p.status ?? ""),
      ref: p.provider_reference ? String(p.provider_reference) : "",
      at: p.created_at ? String(p.created_at) : "",
      by: (p.recorded_by as string | null) ?? null,
    }))
    .sort((a, b) => b.at.localeCompare(a.at));

  const ids = [
    ...new Set(
      [...notes.map((n) => n.created_by), ...hist.map((h) => h.changed_by), ...pays.map((p) => p.by)].filter(
        (x): x is string => !!x
      )
    ),
  ];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const r = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (r.data ?? []) as { id: string; full_name: string | null }[]) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }
  const who = (uid: string | null) => (uid ? (names.get(uid) ?? "مدير") : "النظام");

  const paid = pays.filter((p) => p.status === "succeeded").reduce((n, p) => n + p.amount, 0);
  const remaining = Math.max(0, (Number(o.total) || 0) - paid);
  const closed = o.status === "cancelled" || o.status === "returned";
  const place = [o.governorate, o.area].filter(Boolean).join("، ");
  const summary = whatsappSummary({ ...o, total: Number(o.total) || 0, items });

  return (
    <section>
      <p className="ao-muted">
        <Link href="/admin/orders">الطلبات</Link> / <span dir="ltr">{o.order_number}</span>
      </p>
      <div className="ao-head">
        <h1 className="qs-h1" dir="ltr" style={{ margin: 0 }}>
          {o.order_number}
        </h1>
        <span>
          <span className={`ao-badge ao-st-${o.status}`}>{statusLabel(o.status)}</span>{" "}
          <span className={`ao-badge ao-pay-${o.payment_status}`}>
            {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
          </span>
        </span>
      </div>
      <p className="ao-muted">
        {formatDateTime(o.created_at)} · {o.user_id ? "زبون مسجل" : "زائر"}
      </p>

      <div className="ao-grid">
        <div className="ao-col">
          <div className="ao-card">
            <h2>المنتجات</h2>
            <ul className="ao-items">
              {items.map((it) => {
                const img = publicImageUrl("product-images", it.image_path);
                return (
                  <li key={it.id} className="ao-it">
                    <span className="ao-it-img">
                      {img ? <img src={img} alt={it.product_name} loading="lazy" /> : null}
                    </span>
                    <div>
                      <strong>{it.product_name}</strong>
                      {it.variant_label ? <p className="ao-muted">{it.variant_label}</p> : null}
                      <p className="ao-muted">
                        {it.quantity} × {formatMoney(Number(it.unit_price) || 0)}
                        {it.sku ? ` · ${it.sku}` : ""}
                      </p>
                    </div>
                    <strong>{formatMoney(Number(it.line_total) || 0)}</strong>
                  </li>
                );
              })}
            </ul>
            <div className="ao-sum">
              <span>المجموع الفرعي</span>
              <span>{formatMoney(Number(o.subtotal) || 0)}</span>
            </div>
            {Number(o.discount_total) > 0 ? (
              <div className="ao-sum">
                <span>الخصم</span>
                <span>-{formatMoney(Number(o.discount_total))}</span>
              </div>
            ) : null}
            <div className="ao-sum">
              <span>التوصيل</span>
              <span>{formatMoney(Number(o.delivery_fee) || 0)}</span>
            </div>
            <div className="ao-sum tot">
              <span>الإجمالي</span>
              <span>{formatMoney(Number(o.total) || 0)}</span>
            </div>
            <div className="ao-sum">
              <span>المدفوع</span>
              <span>{formatMoney(paid)}</span>
            </div>
            <div className="ao-sum">
              <span>المتبقي</span>
              <span>{formatMoney(remaining)}</span>
            </div>
          </div>

          <div className="ao-card">
            <h2>الزبون والتوصيل</h2>
            <dl className="ao-kv">
              <div>
                <dt>الاسم</dt>
                <dd>{o.customer_name}</dd>
              </div>
              <div>
                <dt>الهاتف</dt>
                <dd dir="ltr">{o.phone}</dd>
              </div>
              {place ? (
                <div>
                  <dt>المنطقة</dt>
                  <dd>{place}</dd>
                </div>
              ) : null}
              {o.address ? (
                <div>
                  <dt>العنوان</dt>
                  <dd>{o.address}</dd>
                </div>
              ) : null}
              {o.landmark ? (
                <div>
                  <dt>أقرب نقطة دالة</dt>
                  <dd>{o.landmark}</dd>
                </div>
              ) : null}
              {o.notes ? (
                <div>
                  <dt>ملاحظات الزبون</dt>
                  <dd>{o.notes}</dd>
                </div>
              ) : null}
              <div>
                <dt>طريقة الدفع</dt>
                <dd>{PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method}</dd>
              </div>
              {o.delivered_at ? (
                <div>
                  <dt>تاريخ التسليم</dt>
                  <dd>{formatDateTime(o.delivered_at)}</dd>
                </div>
              ) : null}
              {o.cancel_reason ? (
                <div>
                  <dt>سبب الإلغاء</dt>
                  <dd>{o.cancel_reason}</dd>
                </div>
              ) : null}
              {o.return_reason ? (
                <div>
                  <dt>سبب الإرجاع</dt>
                  <dd>{o.return_reason}</dd>
                </div>
              ) : null}
              {o.stock_restored_at ? (
                <div>
                  <dt>إعادة المخزون</dt>
                  <dd>{formatDateTime(o.stock_restored_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="ao-card">
            <h2>سجل تغييرات الحالة</h2>
            {hist.length === 0 ? (
              <p className="ao-muted">لا يوجد سجل.</p>
            ) : (
              <ul className="ao-log">
                {hist.map((h) => (
                  <li key={h.id}>
                    <strong>
                      {h.from_status ? `${statusLabel(h.from_status)} ← ` : ""}
                      {statusLabel(h.to_status)}
                    </strong>
                    <p className="ao-muted">
                      {who(h.changed_by)} · {formatDateTime(h.created_at)}
                    </p>
                    {h.note ? <p>{h.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ao-col">
          <div className="ao-card">
            <h2>مشاركة وطباعة</h2>
            <OrderShare orderId={o.id} phone={o.phone} summary={summary} />
          </div>

          <div className="ao-card">
            <h2>حالة الطلب</h2>
            <StatusForm key={o.status} orderId={o.id} current={o.status} />
          </div>

          <div className="ao-card">
            <h2>الدفع</h2>
            {pays.length > 0 ? (
              <ul className="ao-log" style={{ marginBottom: 12 }}>
                {pays.map((p) => (
                  <li key={p.id || p.at}>
                    <strong>{formatMoney(p.amount)}</strong> ·{" "}
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method} · {PAY_ST[p.status] ?? p.status}
                    <p className="ao-muted">
                      {who(p.by)}
                      {p.at ? ` · ${formatDateTime(p.at)}` : ""}
                      {p.ref ? ` · ${p.ref}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ao-muted" style={{ marginBottom: 12 }}>
                لا توجد دفعات مسجلة. الطلب غير مدفوع حتى تُسجَّل دفعة.
              </p>
            )}
            {pRes.error ? <p className="ao-err">تعذر تحميل الدفعات.</p> : null}
            {closed ? (
              <p className="ao-muted">الطلب مغلق ولا يقبل دفعات جديدة.</p>
            ) : (
              <PaymentForm orderId={o.id} remaining={remaining} />
            )}
          </div>

          <div className="ao-card">
            <h2>التوصيل</h2>
            {DELIVERY_EDITABLE.includes(o.status) ? (
              <DeliveryForm
                orderId={o.id}
                fee={Number(o.delivery_fee) || 0}
                notes={o.delivery_notes ?? ""}
              />
            ) : (
              <dl className="ao-kv">
                <div>
                  <dt>التكلفة</dt>
                  <dd>{formatMoney(Number(o.delivery_fee) || 0)}</dd>
                </div>
                <div>
                  <dt>الملاحظات</dt>
                  <dd>{o.delivery_notes || "لا يوجد"}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="ao-card">
            <h2>ملاحظات داخلية</h2>
            <NoteForm orderId={o.id} />
            {notes.length > 0 ? (
              <ul className="ao-log" style={{ marginTop: 14 }}>
                {notes.map((n) => (
                  <li key={n.id}>
                    <p>{n.body}</p>
                    <p className="ao-muted">
                      {who(n.created_by)} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
