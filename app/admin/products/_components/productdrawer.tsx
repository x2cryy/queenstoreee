"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, Pencil, ImageOff } from "lucide-react";
import { fmtIQD, fmtNum, fmtDate } from "../../../../lib/admin/fmt";
import { Badge } from "../../_components/ui";

export type DrawerData = {
  product: {
    id: string; name: string; brand: string | null; description: string | null;
    price: number; compare_at_price: number | null; quantity: number;
    low_stock_threshold: number; status: string; is_featured: boolean; is_new: boolean;
    barcode: string | null; qr_code: string | null; category: string | null;
    created_at: string; updated_at: string;
  };
  cost: number | null;
  images: { id: string; url: string | null; primary: boolean }[];
  variants: {
    id: string; sku: string | null; barcode: string | null; price_adjustment: number;
    quantity: number; track_quantity: boolean; is_active: boolean;
  }[];
  movements: {
    id: string; movement_type: string; quantity_before: number; change: number;
    quantity_after: number; reason: string | null; created_at: string;
  }[];
  logs: { id: number; action: string; created_at: string }[];
};

const TABS = [
  ["overview", "نظرة عامة"],
  ["variants", "الخيارات"],
  ["history", "السجل"],
] as const;
type Tab = (typeof TABS)[number][0];

const MOVE: Record<string, string> = {
  sale: "بيع", restock: "إعادة تخزين", adjustment: "تعديل يدوي", return: "إرجاع",
};

const card: React.CSSProperties = {
  border: "1px solid var(--c-line, #ECE6DA)",
  borderRadius: 12,
  padding: 14,
  background: "var(--c-surface, #fff)",
  minWidth: 0,
};

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-line-soft, #F1ECE2)", fontSize: 14 }}>
      <span style={{ color: "var(--c-muted, #6B6458)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "end", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

export function ProductDrawer({ data, closeHref, editHref }: { data: DrawerData; closeHref: string; editHref: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const p = data.product;
  const close = () => router.push(closeHref, { scroll: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  const tone = p.quantity <= 0 ? "bad" : p.quantity <= p.low_stock_threshold ? "warn" : "good";
  const stockLabel = p.quantity <= 0 ? "نافد" : p.quantity <= p.low_stock_threshold ? "منخفض" : "متوفر";
  const unitProfit = data.cost !== null ? p.price - data.cost : null;
  const totalProfit = unitProfit !== null ? unitProfit * p.quantity : null;
  const margin = unitProfit !== null && p.price > 0 ? Math.round((unitProfit / p.price) * 1000) / 10 : null;

  const history = [
    ...data.movements.map((m) => ({
      key: "m" + m.id,
      at: m.created_at,
      title: MOVE[m.movement_type] ?? m.movement_type,
      body: "من " + fmtNum(m.quantity_before) + " إلى " + fmtNum(m.quantity_after) + (m.reason ? " - " + m.reason : ""),
      badge: (m.change > 0 ? "+" : "") + fmtNum(m.change),
      tone: (m.change >= 0 ? "good" : "warn") as "good" | "warn",
    })),
    ...data.logs.map((l) => ({
      key: "l" + l.id,
      at: l.created_at,
      title: ({ product_created: "إضافة المنتج", product_updated: "تعديل بيانات المنتج" } as Record<string, string>)[l.action] ?? l.action,
      body: "",
      badge: "",
      tone: "info" as const,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

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
        aria-label={"تفاصيل " + p.name}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: "min(480px, 100vw)", zIndex: 61,
          background: "var(--c-bg-soft, #FAF8F3)", color: "var(--c-text, #17140F)",
          display: "flex", flexDirection: "column", boxShadow: "0 0 30px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderBottom: "1px solid var(--c-line, #ECE6DA)", background: "var(--c-surface, #fff)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, overflowWrap: "anywhere" }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted2, #8A8372)" }}>{[p.brand, p.category].filter(Boolean).join(" - ") || "-"}</div>
          </div>
          <Link className="ds-btn" href={editHref} aria-label="تعديل المنتج"><Pencil size={16} /> تعديل</Link>
          <button type="button" className="ds-btn" onClick={close} aria-label="إغلاق"><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 14px 0" }}>
          {TABS.map(([k, l]) => (
            <button key={k} type="button" className={k === tab ? "ds-btn ds-btn-gold" : "ds-btn"} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 14, display: "grid", gap: 12, alignContent: "start" }}>
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="ds-kpi"><span className="ds-kpi-label">السعر</span><span className="ds-kpi-value">{fmtIQD(p.price)}</span></div>
                <div className="ds-kpi"><span className="ds-kpi-label">التكلفة</span><span className="ds-kpi-value">{data.cost !== null ? fmtIQD(data.cost) : "-"}</span></div>
                <div className="ds-kpi" data-tone={tone}><span className="ds-kpi-label">المخزون</span><span className="ds-kpi-value">{fmtNum(p.quantity)}</span><span className="ds-kpi-hint">{stockLabel}</span></div>
                <div className="ds-kpi" data-tone={unitProfit !== null && unitProfit < 0 ? "bad" : "good"}>
                  <span className="ds-kpi-label">الربح المتوقع</span>
                  <span className="ds-kpi-value">{totalProfit !== null ? fmtIQD(totalProfit) : "-"}</span>
                  <span className="ds-kpi-hint">{margin !== null ? "هامش " + margin + "% للوحدة" : "التكلفة غير مسجلة"}</span>
                </div>
              </div>

              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>الصور</div>
                {data.images.length === 0 ? (
                  <div className="ds-empty">لا توجد صور لهذا المنتج.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 }}>
                    {data.images.map((im) => (
                      <div key={im.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: "var(--c-bg-soft2, #F5F1E8)", display: "grid", placeItems: "center" }}>
                        {im.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={im.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <ImageOff size={20} />
                        )}
                        {im.primary ? <span style={{ position: "absolute", top: 4, insetInlineStart: 4 }}><Badge tone="good">رئيسية</Badge></span> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={card}>
                <Line label="الحالة"><Badge tone={p.status === "active" ? "good" : "info"}>{p.status === "active" ? "نشط" : "مخفي"}</Badge></Line>
                <Line label="حد التنبيه">{fmtNum(p.low_stock_threshold)}</Line>
                <Line label="السعر قبل الخصم">{p.compare_at_price ? fmtIQD(p.compare_at_price) : "-"}</Line>
                <Line label="الباركود"><span dir="ltr" style={{ fontFamily: "monospace" }}>{p.barcode ?? "-"}</span></Line>
                <Line label="رمز QR"><span dir="ltr" style={{ fontFamily: "monospace" }}>{p.qr_code ?? "-"}</span></Line>
                <Line label="مميز / جديد">{(p.is_featured ? "مميز" : "-") + " / " + (p.is_new ? "جديد" : "-")}</Line>
                <Line label="آخر تعديل">{fmtDate(p.updated_at)}</Line>
              </div>

              {p.description ? <div style={{ ...card, fontSize: 14, lineHeight: 1.7, overflowWrap: "anywhere" }}>{p.description}</div> : null}
            </>
          )}

          {tab === "variants" && (
            data.variants.length === 0 ? (
              <div className="ds-empty">لا توجد خيارات لهذا المنتج.</div>
            ) : (
              data.variants.map((v) => (
                <div key={v.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <strong dir="ltr" style={{ overflowWrap: "anywhere" }}>{v.sku ?? "-"}</strong>
                    <Badge tone={v.is_active ? "good" : undefined}>{v.is_active ? "فعال" : "موقوف"}</Badge>
                  </div>
                  <Line label="السعر النهائي">{fmtIQD(p.price + v.price_adjustment)}</Line>
                  <Line label="الكمية">{v.track_quantity ? fmtNum(v.quantity) : "غير محسوبة"}</Line>
                  <Line label="الباركود"><span dir="ltr" style={{ fontFamily: "monospace" }}>{v.barcode ?? "-"}</span></Line>
                </div>
              ))
            )
          )}

          {tab === "history" && (
            history.length === 0 ? (
              <div className="ds-empty">لا يوجد سجل لهذا المنتج بعد.</div>
            ) : (
              history.map((h) => (
                <div key={h.key} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{h.title}</div>
                    {h.body ? <div style={{ fontSize: 13, color: "var(--c-muted, #6B6458)", overflowWrap: "anywhere" }}>{h.body}</div> : null}
                    <div style={{ fontSize: 12, color: "var(--c-muted2, #8A8372)" }}>{fmtDate(h.at)}</div>
                  </div>
                  {h.badge ? <Badge tone={h.tone}>{h.badge}</Badge> : null}
                </div>
              ))
            )
          )}
        </div>
      </motion.aside>
    </>
  );
}
