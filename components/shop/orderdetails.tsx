import { formatPrice } from "../../lib/shop/format";
import { publicImageUrl } from "../../lib/shop/images";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  formatOrderDate,
  statusLabel,
  type OrderJson,
} from "../../lib/shop/orders";
import OrderActions from "./OrderActions";

export default function OrderDetails({
  order,
  placed = false,
}: {
  order: OrderJson;
  placed?: boolean;
}) {
  const where = [order.governorate, order.area].filter(Boolean).join("، ");
  const reason =
    order.status === "cancelled"
      ? order.cancel_reason
      : order.status === "returned"
        ? order.return_reason
        : null;

  return (
    <div className="qo-order">
      {placed ? (
        <div className="qo-success" role="status">
          <h2>تم استلام طلبك</h2>
          <p>سيتواصل معك المتجر لتأكيد الطلب وترتيب التوصيل. احتفظ برقم الطلب.</p>
        </div>
      ) : null}

      <section className="qo-card">
        <div className="qo-head">
          <div>
            <p className="qo-k">رقم الطلب</p>
            <p className="qo-num" dir="ltr">
              {order.order_number}
            </p>
          </div>
          <span className={`qo-badge qo-st-${order.status}`}>{statusLabel(order.status)}</span>
        </div>
        <dl className="qo-meta">
          <div>
            <dt>تاريخ الطلب</dt>
            <dd>{formatOrderDate(order.created_at)}</dd>
          </div>
          <div>
            <dt>طريقة الدفع</dt>
            <dd>{PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}</dd>
          </div>
          <div>
            <dt>حالة الدفع</dt>
            <dd>{PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}</dd>
          </div>
          <div>
            <dt>المبلغ النهائي</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>
        {reason ? <p className="qo-reason">السبب: {reason}</p> : null}
        <OrderActions order={order} />
      </section>

      <section className="qo-card">
        <h2>المنتجات</h2>
        <ul className="qo-lines">
          {order.items.map((it, i) => {
            const img = publicImageUrl("product-images", it.image_path);
            return (
              <li key={`${it.product_name}-${i}`} className="qo-li">
                <span className="qo-li-img">
                  {img ? (
                    <img src={img} alt={it.product_name} loading="lazy" decoding="async" />
                  ) : (
                    <span className="qm-noimg qm-logo">QUEEN</span>
                  )}
                </span>
                <div>
                  <p className="qo-li-name">{it.product_name}</p>
                  {it.variant_label ? <p className="qo-li-sub">{it.variant_label}</p> : null}
                  <p className="qo-li-sub">
                    {it.quantity} × {formatPrice(it.unit_price)}
                  </p>
                </div>
                <strong>{formatPrice(it.line_total)}</strong>
              </li>
            );
          })}
        </ul>
        <div className="qo-row">
          <span>المجموع الفرعي</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discount_total > 0 ? (
          <div className="qo-row">
            <span>الخصم</span>
            <span>-{formatPrice(order.discount_total)}</span>
          </div>
        ) : null}
        <div className="qo-row">
          <span>التوصيل</span>
          <span>{formatPrice(order.delivery_fee)}</span>
        </div>
        <div className="qo-row qo-total">
          <span>الإجمالي</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>
      </section>

      <section className="qo-card">
        <h2>بيانات التوصيل</h2>
        <dl className="qo-meta" style={{ marginTop: 0 }}>
          <div>
            <dt>الاسم</dt>
            <dd>{order.customer_name}</dd>
          </div>
          <div>
            <dt>الهاتف</dt>
            <dd dir="ltr">{order.phone}</dd>
          </div>
          {where ? (
            <div>
              <dt>المنطقة</dt>
              <dd>{where}</dd>
            </div>
          ) : null}
          {order.address ? (
            <div>
              <dt>العنوان</dt>
              <dd>{order.address}</dd>
            </div>
          ) : null}
          {order.landmark ? (
            <div>
              <dt>أقرب نقطة دالة</dt>
              <dd>{order.landmark}</dd>
            </div>
          ) : null}
          {order.notes ? (
            <div>
              <dt>ملاحظاتك</dt>
              <dd>{order.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {order.history.length > 0 ? (
        <section className="qo-card">
          <h2>سجل الحالة</h2>
          <ul className="qo-tl">
            {order.history.map((h, i) => (
              <li key={`${h.status}-${i}`}>
                <strong>{statusLabel(h.status)}</strong>
                <span>{formatOrderDate(h.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
