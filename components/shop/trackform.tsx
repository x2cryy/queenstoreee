"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { lookupOrder } from "../../app/(shop)/track/actions";
import type { TrackState } from "../../lib/shop/orders";
import OrderDetails from "./OrderDetails";

const initial: TrackState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="qm-btn qm-btn-gold qo-submit" disabled={pending}>
      {pending ? "جارٍ البحث" : "تتبع الطلب"}
    </button>
  );
}

export default function TrackForm() {
  const [state, action] = useActionState(lookupOrder, initial);
  const v = state.values;
  return (
    <div className="qo-order">
      <form action={action} className="qo-card" noValidate>
        <h2>تتبع طلبك</h2>
        <p className="qo-hint" style={{ marginBottom: 14 }}>
          أدخل رقم الطلب ورقم الهاتف المستخدم عند الشراء.
        </p>
        {state.message && !state.ok ? (
          <div className="qo-alert" role="alert">
            {state.message}
          </div>
        ) : null}
        <div className="qo-field">
          <label htmlFor="tr-num">رقم الطلب</label>
          <input
            id="tr-num"
            name="order_number"
            className="qo-input"
            dir="ltr"
            autoComplete="off"
            maxLength={40}
            required
            defaultValue={v?.order_number ?? ""}
          />
        </div>
        <div className="qo-field">
          <label htmlFor="tr-phone">رقم الهاتف</label>
          <input
            id="tr-phone"
            name="phone"
            className="qo-input"
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            maxLength={20}
            required
            defaultValue={v?.phone ?? ""}
          />
        </div>
        <Submit />
      </form>
      {state.ok && state.order ? <OrderDetails order={state.order} /> : null}
    </div>
  );
}
