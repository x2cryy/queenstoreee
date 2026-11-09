"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adjustStock, type AdjustState } from "../actions";

type V = { id: string; label: string; quantity: number; track: boolean };
type P = { id: string; name: string; quantity: number; variants?: V[] };

const KINDS = [
  ["stock_in", "إدخال مخزون", 1],
  ["return", "إرجاع من زبون", 1],
  ["damage", "تالف", -1],
  ["adj_plus", "تعديل بالزيادة", 1],
  ["adj_minus", "تعديل بالنقصان", -1],
] as const;

export function AdjustForm({ products, selected }: { products: P[]; selected?: string }) {
  const [state, action, pending] = useActionState<AdjustState, FormData>(adjustStock, {});
  const ref = useRef<HTMLFormElement>(null);
  const [pid, setPid] = useState(selected ?? products[0]?.id ?? "");
  const [vid, setVid] = useState("");
  const [kind, setKind] = useState<string>("stock_in");
  const [qty, setQty] = useState("");

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setQty("");
    }
  }, [state.n, state.ok]);

  const prod = products.find((p) => p.id === pid);
  const variant = prod?.variants?.find((v) => v.id === vid);
  const untracked = !!variant && !variant.track;
  const curQty = prod ? (variant && variant.track ? variant.quantity : prod.quantity) : null;
  const sign = KINDS.find((k) => k[0] === kind)?.[2] ?? 1;
  const n = Number(qty.replace(/,/g, ""));
  const next = curQty !== null && Number.isInteger(n) && n > 0 ? curQty + sign * n : null;

  return (
    <form ref={ref} action={action} className="ds-form">
      {products.length > 1 ? (
        <div>
          <label className="ds-label" htmlFor="adj-product">المنتج</label>
          <select className="ds-select" id="adj-product" name="product_id" value={pid} onChange={(e) => { setPid(e.target.value); setVid(""); }}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="product_id" value={pid} />
      )}

      {prod?.variants?.length ? (
        <div>
          <label className="ds-label" htmlFor="adj-variant">الخيار</label>
          <select className="ds-select" id="adj-variant" value={vid} onChange={(e) => setVid(e.target.value)}>
            <option value="">المنتج كله</option>
            {prod.variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
      ) : null}
      <input type="hidden" name="variant_id" value={vid} />
      <input type="hidden" name="expected" value={curQty !== null ? String(curQty) : ""} />

      <div className="ds-kpi">
        <span className="ds-kpi-label">{variant && variant.track ? "كمية الخيار الحالية" : "الكمية الحالية"}</span>
        <span className="ds-kpi-value">{curQty ?? "—"}</span>
      </div>
      {untracked ? <div className="ds-desc">هذا الخيار لا يتتبع كمية مستقلة، فتُسجَّل الحركة على كمية المنتج.</div> : null}

      <div className="ds-split">
        <div>
          <label className="ds-label" htmlFor="adj-kind">نوع التعديل</label>
          <select className="ds-select" id="adj-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k[0]} value={k[0]}>{k[1]}</option>)}
          </select>
        </div>
        <div>
          <label className="ds-label" htmlFor="adj-qty">الكمية</label>
          <input className="ds-input" id="adj-qty" name="qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="مثال: 5" />
        </div>
      </div>

      {next !== null ? (
        <div className="ds-desc" role="status">
          الكمية بعد الحفظ: {next}{next < 0 ? " (سالبة، وسيرفضها النظام)" : ""}
        </div>
      ) : null}

      <div>
        <label className="ds-label" htmlFor="adj-reason">سبب التعديل (3 أحرف على الأقل)</label>
        <textarea className="ds-textarea" id="adj-reason" name="reason" rows={2} />
      </div>

      {state.error ? <p role="alert" style={{ color: "var(--c-bad,#B91C1C)", fontWeight: 600, margin: 0 }}>{state.error}</p> : null}
      {state.ok ? <p role="status" style={{ color: "#15803D", fontWeight: 600, margin: 0 }}>{state.ok}</p> : null}

      <button type="submit" className="ds-btn ds-btn-gold" disabled={pending || !prod}>
        {pending ? "جارٍ الحفظ..." : "حفظ الحركة"}
      </button>
    </form>
  );
}
