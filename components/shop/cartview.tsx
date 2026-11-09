"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import {
  buildLines,
  fetchCartProducts,
  CHECKOUT_PATH,
  type CartProductRaw,
} from "../../lib/shop/cart";
import { formatPrice } from "../../lib/shop/format";

function Skeleton() {
  return (
    <div className="qm-cart" aria-busy="true">
      <div style={{ display: "grid", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="qm-skel" style={{ aspectRatio: "auto", height: 130 }} />
        ))}
      </div>
      <div className="qm-skel" style={{ aspectRatio: "auto", height: 200 }} />
    </div>
  );
}

export default function CartView() {
  const { items, ready, setQty, removeItem } = useCart();
  const [products, setProducts] = useState<Record<string, CartProductRaw>>({});
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef<Set<string>>(new Set());

  const idsKey = useMemo(
    () => [...new Set(items.map((i) => i.productId))].sort().join(","),
    [items]
  );

  useEffect(() => {
    if (!ready) return;
    const ids = idsKey ? idsKey.split(",") : [];
    const missing = ids.filter((id) => !loaded.current.has(id));
    if (missing.length === 0) {
      setPhase("done");
      return;
    }
    let live = true;
    setPhase("loading");
    fetchCartProducts(missing)
      .then((map) => {
        if (!live) return;
        missing.forEach((id) => loaded.current.add(id));
        setProducts((prev) => ({ ...prev, ...map }));
        setPhase("done");
      })
      .catch(() => {
        if (live) setPhase("error");
      });
    return () => {
      live = false;
    };
  }, [ready, idsKey, attempt]);

  const lines = useMemo(
    () => (phase === "done" ? buildLines(items, products) : []),
    [phase, items, products]
  );

  if (!ready) return <Skeleton />;

  if (items.length === 0) {
    return (
      <div className="qm-empty">
        <h2>سلتك فارغة</h2>
        <p>تصفح المنتجات وأضف ما يعجبك.</p>
        <Link href="/products" className="qm-btn qm-btn-gold" style={{ marginTop: 18 }}>
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="qm-empty">
        <h2>تعذر تحميل السلة</h2>
        <p>تحقق من اتصالك ثم حاول مجدداً. منتجاتك محفوظة.</p>
        <button
          type="button"
          className="qm-btn qm-btn-gold"
          style={{ marginTop: 18, cursor: "pointer" }}
          onClick={() => setAttempt((a) => a + 1)}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (phase === "loading") return <Skeleton />;

  const valid = lines.filter((l) => l.status === "ok" || l.status === "adjusted");
  const invalid = lines.length - valid.length;
  const pieces = valid.reduce((n, l) => n + l.qty, 0);
  const total = valid.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const canCheckout = valid.length > 0 && invalid === 0;

  return (
    <div className="qm-cart">
      <ul className="qm-lines">
        {lines.map((l) => {
          const bad = l.status === "out" || l.status === "gone";
          const href = l.slug ? `/product/${encodeURIComponent(l.slug)}` : null;
          const img = l.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image} alt={l.name} loading="lazy" decoding="async" />
          ) : (
            <span className="qm-noimg qm-logo">QUEEN</span>
          );
          return (
            <li key={l.key} className={`qm-line${bad ? " bad" : ""}`}>
              {href ? (
                <Link href={href} className="qm-line-img" aria-label={l.name}>
                  {img}
                </Link>
              ) : (
                <span className="qm-line-img">{img}</span>
              )}
              <div className="qm-line-main">
                {href ? (
                  <Link href={href} className="qm-line-name">
                    {l.name}
                  </Link>
                ) : (
                  <span className="qm-line-name">{l.name}</span>
                )}
                {l.label ? <p className="qm-line-opt">{l.label}</p> : null}
                {!bad ? (
                  <p className="qm-line-unit">
                    {formatPrice(l.unitPrice)}
                    {l.compareAt ? <s>{formatPrice(l.compareAt)}</s> : null}
                  </p>
                ) : null}
                {l.status === "adjusted" ? (
                  <p className="qm-line-warn">
                    تم تعديل الكمية إلى المتاح حالياً ({l.stock})
                  </p>
                ) : null}
                {l.status === "out" ? (
                  <p className="qm-line-warn">غير متوفر حالياً. احذفه للمتابعة.</p>
                ) : null}
                {l.status === "gone" ? (
                  <p className="qm-line-warn">لم يعد هذا المنتج متاحاً. احذفه للمتابعة.</p>
                ) : null}
                <div className="qm-line-row">
                  {!bad ? (
                    <div className="qm-qty sm" role="group" aria-label={`كمية ${l.name}`}>
                      <button
                        type="button"
                        aria-label="إنقاص"
                        disabled={l.qty <= 1}
                        onClick={() => setQty(l.productId, l.variantId, l.qty - 1)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{l.qty}</span>
                      <button
                        type="button"
                        aria-label="زيادة"
                        disabled={l.qty >= l.stock}
                        onClick={() => setQty(l.productId, l.variantId, l.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                  {!bad ? <strong>{formatPrice(l.unitPrice * l.qty)}</strong> : null}
                </div>
                {!bad && l.qty >= l.stock ? (
                  <p className="qm-note">الحد الأقصى المتاح: {l.stock}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="qm-line-del"
                aria-label={`حذف ${l.name}`}
                onClick={() => removeItem(l.productId, l.variantId)}
              >
                حذف
              </button>
            </li>
          );
        })}
      </ul>

      <aside className="qm-sum" aria-label="ملخص السلة">
        <h2>ملخص الطلب</h2>
        <div className="qm-sum-row">
          <span>عدد القطع</span>
          <span>{pieces}</span>
        </div>
        <div className="qm-sum-row qm-sum-total">
          <span>الإجمالي</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <p className="qm-note">المبلغ النهائي يُؤكَّد عند إتمام الطلب.</p>
        {invalid > 0 ? (
          <p className="qm-line-warn">أزل المنتجات غير المتاحة لتتمكن من المتابعة.</p>
        ) : null}
        {canCheckout ? (
          <Link href={CHECKOUT_PATH} className="qm-btn qm-btn-gold qm-sum-btn">
            إتمام الطلب
          </Link>
        ) : (
          <span className="qm-btn qm-btn-gold qm-sum-btn qm-dis" aria-disabled="true">
            إتمام الطلب
          </span>
        )}
        <Link href="/products" className="qm-more qm-sum-more">
          متابعة التسوق
        </Link>
      </aside>
    </div>
  );
}
