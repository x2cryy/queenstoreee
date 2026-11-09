"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { uploadImages, saveVariant, type MS } from "../media-actions";

export function ImageUploadForm({ productId }: { productId: string }) {
  const [st, action, pending] = useActionState<MS, FormData>(uploadImages, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (st.ok) ref.current?.reset();
  }, [st.n, st.ok]);
  return (
    <form action={action} ref={ref}>
      <input type="hidden" name="product_id" value={productId} />
      <label className="ds-label" htmlFor="files">إضافة صور (JPG / PNG / WebP، حتى 5 ميغابايت للصورة)</label>
      <input className="ds-input" style={{ paddingTop: 8 }} id="files" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp" required />
      {st.error ? <p role="alert" style={{ color: "#B91C1C", marginTop: 12, fontWeight: 600 }}>{st.error}</p> : null}
      {st.ok ? <p role="status" style={{ color: "#15803D", marginTop: 12, fontWeight: 600 }}>{st.ok}</p> : null}
      <div style={{ marginTop: 14 }}>
        <button className="ds-btn ds-btn-gold" type="submit" disabled={pending}>{pending ? "جارٍ الرفع..." : "رفع الصور"}</button>
      </div>
    </form>
  );
}

export type VariantInit = {
  id: string; sku: string | null; barcode: string | null; price_adjustment: number;
  quantity: number; track_quantity: boolean; is_active: boolean;
};

export function VariantForm({ productId, variant }: { productId: string; variant?: VariantInit }) {
  const [st, action, pending] = useActionState<MS, FormData>(saveVariant, {});
  const v = variant;
  return (
    <form action={action}>
      <input type="hidden" name="product_id" value={productId} />
      {v ? <input type="hidden" name="id" value={v.id} /> : null}
      <div className="ds-form">
        <div>
          <label className="ds-label" htmlFor="sku">اسم المتغير</label>
          <input className="ds-input" id="sku" name="sku" placeholder="مثال: أحمر - M" defaultValue={v?.sku ?? ""} required />
        </div>
        <div>
          <label className="ds-label" htmlFor="vbarcode">الباركود</label>
          <input className="ds-input" id="vbarcode" name="barcode" dir="ltr" defaultValue={v?.barcode ?? ""} />
        </div>
        <div>
          <label className="ds-label" htmlFor="price_adjustment">فرق السعر (د.ع)</label>
          <input className="ds-input" id="price_adjustment" name="price_adjustment" type="number" min={0} inputMode="numeric" defaultValue={v?.price_adjustment ?? 0} required />
        </div>
        <div>
          <label className="ds-label" htmlFor="vquantity">الكمية</label>
          <input className="ds-input" id="vquantity" name="quantity" type="number" min={0} inputMode="numeric" defaultValue={v?.quantity ?? 0} required />
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--c-text, #17140F)" }}>
          <input type="checkbox" name="track_quantity" defaultChecked={v ? v.track_quantity : true} /> تتبّع كمية هذا المتغير
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--c-text, #17140F)" }}>
          <input type="checkbox" name="is_active" defaultChecked={v ? v.is_active : true} /> فعّال
        </label>
      </div>
      {st.error ? <p role="alert" style={{ color: "#B91C1C", marginTop: 12, fontWeight: 600 }}>{st.error}</p> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="ds-btn ds-btn-gold" type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : v ? "حفظ المتغير" : "إضافة المتغير"}
        </button>
        {v ? <Link className="ds-btn" href={`/admin/products/${productId}`}>إلغاء</Link> : null}
      </div>
    </form>
  );
}
