"use client";

import { useActionState } from "react";
import { saveDelivery, type FS } from "../actions";

export function DeliveryForm({ fee, freeOver }: { fee: number; freeOver: number | null }) {
  const [st, action, pending] = useActionState<FS, FormData>(saveDelivery, {});
  return (
    <form action={action}>
      <div className="ds-form">
        <div>
          <label className="ds-label" htmlFor="fee">رسوم التوصيل (د.ع)</label>
          <input className="ds-input" id="fee" name="fee" type="number" min={0} inputMode="numeric" defaultValue={fee} required />
        </div>
        <div>
          <label className="ds-label" htmlFor="free_over">توصيل مجاني للطلبات فوق (د.ع)</label>
          <input className="ds-input" id="free_over" name="free_over" type="number" min={0} inputMode="numeric" defaultValue={freeOver ?? ""} placeholder="اتركه فارغاً لتعطيل الميزة" />
        </div>
      </div>
      {st.error ? <p role="alert" style={{ color: "#B91C1C", marginTop: 12, fontWeight: 600 }}>{st.error}</p> : null}
      {st.ok ? <p role="status" style={{ color: "#15803D", marginTop: 12, fontWeight: 600 }}>{st.ok}</p> : null}
      <div style={{ marginTop: 16 }}>
        <button className="ds-btn ds-btn-gold" type="submit" disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</button>
      </div>
    </form>
  );
}
