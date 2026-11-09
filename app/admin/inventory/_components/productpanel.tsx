import Link from "next/link";
import { ExternalLink, ImageOff, Pencil, PackagePlus, X } from "lucide-react";
import { Badge } from "../../_components/ui";
import { fmtDate, fmtIQD, fmtNum } from "../../../../lib/admin/fmt";
import type { Detail } from "../../../../lib/admin/inventory";
import { CopyLink, EscClose } from "./PanelClient";
import st from "./panel.module.css";

const MOVE: Record<string, string> = {
  sale: "بيع", restock: "إعادة تخزين", stock_in: "إدخال مخزون", return: "إرجاع",
  damage: "تالف", adjustment: "تعديل يدوي", manual_adjustment: "تعديل يدوي",
};
const LOG: Record<string, string> = {
  product_created: "إضافة المنتج", product_updated: "تعديل بيانات المنتج",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={st.row}><span>{label}</span><span>{children}</span></div>;
}

export function ProductPanel({ d, closeHref, adjustHref }: { d: Detail; closeHref: string; adjustHref: string }) {
  const p = d.product;
  const out = p.quantity <= 0;
  const low = !out && p.quantity <= p.low_stock_threshold;
  const hidden = p.status === "hidden";
  const main = d.images.find((i) => i.primary) ?? d.images[0];
  const rest = d.images.filter((i) => i !== main);
  const unit = d.cost !== null ? p.price - d.cost : null;
  const pct = unit !== null && p.price > 0 ? Math.round((unit / p.price) * 1000) / 10 : null;
  const publicPath = p.slug ? `/product/${p.slug}` : null;

  return (
    <>
      <Link href={closeHref} scroll={false} className={st.overlay} aria-label="إغلاق" />
      <aside className={st.panel} role="dialog" aria-label={`تفاصيل ${p.name}`}>
        <EscClose href={closeHref} />
        <div className={st.head}>
          <div className={st.title}>
            <h2>{p.name}</h2>
            <div className={st.sub}>{[p.brand, p.category].filter(Boolean).join(" - ") || "بدون ماركة أو تصنيف"}</div>
          </div>
          <Link href={closeHref} scroll={false} className="ds-btn" aria-label="إغلاق"><X size={16} /></Link>
        </div>

        <div className={st.body}>
          <div className={st.actions}>
            <Link href={`/admin/products/${p.id}`} className="ds-btn ds-btn-gold"><Pencil size={16} /> تعديل المنتج</Link>
            <Link href={adjustHref} className="ds-btn"><PackagePlus size={16} /> تعديل الكمية</Link>
            {!hidden && publicPath ? (
              <>
                <Link href={publicPath} className="ds-btn"><ExternalLink size={16} /> معاينة في المتجر</Link>
                <CopyLink path={publicPath} />
              </>
            ) : null}
          </div>
          {hidden ? <div className={st.note}>المنتج مخفي، لذلك لا تتوفر معاينة عامة ولا رابط مشاركة حتى يُنشر.</div> : null}

          <div className={st.sec}>
            <div className={st.main}>
              {main?.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={main.url} alt="" /> : <ImageOff size={34} />}
            </div>
            {rest.length ? (
              <div className={st.thumbs}>
                {rest.map((i) => <div key={i.id}>{i.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.url} alt="" loading="lazy" /> : null}</div>)}
              </div>
            ) : null}
          </div>

          <div className={st.sec}>
            <h3>المعلومات الأساسية</h3>
            <Row label="الماركة">{p.brand ?? "—"}</Row>
            <Row label="التصنيف">{p.category ?? "غير مصنف"}</Row>
            <Row label="الباركود">{p.barcode ?? "—"}</Row>
            {p.description ? <div className={st.note}>{p.description}</div> : null}
          </div>

          <div className={st.sec}>
            <h3>السعر والتكلفة</h3>
            <Row label="سعر البيع">{fmtIQD(p.price)}</Row>
            {p.compare_at_price ? <Row label="السعر قبل الخصم">{fmtIQD(p.compare_at_price)}</Row> : null}
            <Row label="سعر التكلفة المسجل">{d.cost !== null ? fmtIQD(d.cost) : "غير مسجلة"}</Row>
            <Row label="هامش مبدئي للوحدة">{unit !== null ? `${fmtIQD(unit)}${pct !== null ? ` (${fmtNum(pct)}٪)` : ""}` : "—"}</Row>
            <div className={st.note}>الهامش المبدئي هو سعر البيع ناقص التكلفة المسجلة، وليس صافي الربح النهائي.</div>
          </div>

          <div className={st.sec}>
            <h3>المخزون</h3>
            <Row label="الكمية">{fmtNum(p.quantity)}</Row>
            <Row label="حد التنبيه">{fmtNum(p.low_stock_threshold)}</Row>
            <Row label="الحالة">
              {out ? <Badge tone="bad">نافد</Badge> : low ? <Badge tone="warn">منخفض</Badge> : <Badge tone="good">متوفر</Badge>}
            </Row>
            {d.variants.length ? (
              <>
                <h3>الخيارات</h3>
                {d.variants.map((v) => (
                  <Row key={v.id} label={[v.sku, v.barcode].filter(Boolean).join(" / ") || "خيار"}>
                    {fmtNum(v.quantity)}{!v.is_active ? " (غير مفعّل)" : v.track_quantity && v.quantity <= 0 ? " (نافد)" : ""}
                  </Row>
                ))}
              </>
            ) : null}
          </div>

          <div className={st.sec}>
            <h3>الظهور</h3>
            <Row label="الحالة">{hidden ? <Badge>مخفي</Badge> : <Badge tone="good">منشور</Badge>}</Row>
            <Row label="آخر تعديل">{fmtDate(p.updated_at)}</Row>
          </div>

          <div className={st.sec}>
            <h3>سجل المخزون والتغييرات</h3>
            {d.movements.length + d.logs.length === 0 ? <div className={st.note}>لا يوجد سجل محفوظ بعد.</div> : (
              <div className={st.hist}>
                {d.movements.map((m) => (
                  <div key={"m" + m.id}>
                    <span>{MOVE[m.movement_type] ?? "حركة"}: من {fmtNum(m.quantity_before)} إلى {fmtNum(m.quantity_after)} ({m.change > 0 ? "+" : ""}{fmtNum(m.change)}){m.reason ? ` - ${m.reason}` : ""}</span>
                    <span>{fmtDate(m.created_at)}</span>
                  </div>
                ))}
                {d.logs.map((l) => (
                  <div key={"l" + l.id}><span>{LOG[l.action] ?? "إجراء"}</span><span>{fmtDate(l.created_at)}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
