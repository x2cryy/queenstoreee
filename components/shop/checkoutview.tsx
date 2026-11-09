"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { buildLines, fetchCartProducts, type CartProductRaw } from "../../lib/shop/cart";
import { formatPrice } from "../../lib/shop/format";
import { GOVERNORATES, PAYMENT_METHOD_LABEL, type PlaceOrderState } from "../../lib/shop/orders";
import { placeOrder, previewCoupon } from "../../app/(shop)/checkout/actions";

const KEY = "queen_checkout_key_v1";
const initialState: PlaceOrderState = { ok: false };

type Props = {
  signedIn: boolean;
  defaults: { fullName: string; phone: string };
  delivery: { fee: number; freeOver: number | null } | null;
  qiEnabled: boolean;
};

function newKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="qo-field">
      <label htmlFor={`co-${name}`}>{label}</label>
      {children}
      {error ? (
        <p className="qo-err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="qm-btn qm-btn-gold qo-submit" disabled={pending || disabled}>
      {pending ? "جارٍ إرسال الطلب" : "تأكيد الطلب"}
    </button>
  );
}

export default function CheckoutView({ signedIn, defaults, delivery, qiEnabled }: Props) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [products, setProducts] = useState<Record<string, CartProductRaw>>({});
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [idem, setIdem] = useState("");
  const [pm, setPm] = useState<string>("cod");
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; sub: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const loaded = useRef<Set<string>>(new Set());
  const finished = useRef(false);
  const [state, action] = useActionState(placeOrder, initialState);

  const idsKey = useMemo(
    () => [...new Set(items.map((i) => i.productId))].sort().join(","),
    [items]
  );

  useEffect(() => {
    let k = "";
    try {
      k = sessionStorage.getItem(KEY) ?? "";
    } catch {
      k = "";
    }
    if (k.length < 16 || k.length > 80) {
      k = newKey();
      try {
        sessionStorage.setItem(KEY, k);
      } catch {
        /* التخزين غير متاح: يبقى المفتاح في هذه الصفحة فقط */
      }
    }
    setIdem(k);
  }, []);

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

  useEffect(() => {
    if (!state.ok || !state.token || finished.current) return;
    finished.current = true;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* لا شيء */
    }
    clear();
    router.replace(pm === "qi_card" ? `/order/${state.token}/pay` : `/order/${state.token}?placed=1`);
  }, [state, clear, router, pm]);

  const lines = useMemo(
    () => (phase === "done" ? buildLines(items, products) : []),
    [phase, items, products]
  );

  if (state.ok) {
    return (
      <div className="qm-empty">
        <h2>تم إرسال طلبك</h2>
        <p>جارٍ فتح صفحة الطلب</p>
      </div>
    );
  }

  if (!ready) {
    return <div className="qm-skel" style={{ aspectRatio: "auto", height: 260 }} aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="qm-empty">
        <h2>سلتك فارغة</h2>
        <p>أضف منتجات إلى السلة قبل إتمام الطلب.</p>
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

  if (phase === "loading") {
    return <div className="qm-skel" style={{ aspectRatio: "auto", height: 260 }} aria-busy="true" />;
  }

  const valid = lines.filter((l) => l.status === "ok" || l.status === "adjusted");
  const invalid = lines.length - valid.length;
  const subtotal = valid.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const discount = applied && applied.sub === subtotal ? Math.min(applied.discount, subtotal) : 0;
  const fee =
    delivery === null
      ? null
      : delivery.freeOver !== null && subtotal - discount >= delivery.freeOver
        ? 0
        : delivery.fee;
  const payload = JSON.stringify(
    valid.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty }))
  );
  const v: Record<string, string> = state.values ?? {};
  const fe: Record<string, string> = state.fieldErrors ?? {};
  const canOrder = valid.length > 0 && invalid === 0 && idem.length >= 16;

  async function applyCoupon() {
    const c = couponInput.trim();
    if (!c) {
      setCouponMsg("اكتب كود الخصم أولاً.");
      return;
    }
    setCouponBusy(true);
    setCouponMsg("");
    try {
      const r = await previewCoupon(c, subtotal);
      if (r.ok) {
        setApplied({ code: r.code, discount: r.discount, sub: subtotal });
      } else {
        setApplied(null);
        setCouponMsg(r.message);
      }
    } catch {
      setCouponMsg("تعذر التحقق من الكود. حاول مرة أخرى.");
    }
    setCouponBusy(false);
  }

  return (
    <form action={action} className="qo-checkout" noValidate>
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="coupon" value={applied && applied.sub === subtotal ? applied.code : ""} />

      <div className="qo-col">
        <section className="qo-card">
          <h2>بيانات التوصيل</h2>
          <p className="qo-hint" style={{ marginBottom: 14 }}>
            {signedIn
              ? "تمت تعبئة بياناتك المحفوظة، ويمكنك تعديلها."
              : "لا حاجة لإنشاء حساب لإتمام الطلب."}
          </p>
          {state.message && !state.ok ? (
            <div className="qo-alert" role="alert">
              {state.message}
            </div>
          ) : null}

          <div className="qo-grid2">
            <Field label="الاسم الكامل" name="full_name" error={fe.full_name}>
              <input
                id="co-full_name"
                name="full_name"
                className="qo-input"
                autoComplete="name"
                maxLength={80}
                required
                defaultValue={v.full_name ?? defaults.fullName}
              />
            </Field>
            <Field label="رقم الهاتف" name="phone" error={fe.phone}>
              <input
                id="co-phone"
                name="phone"
                className="qo-input"
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                maxLength={20}
                required
                defaultValue={v.phone ?? defaults.phone}
              />
            </Field>
            <Field label="المحافظة" name="governorate" error={fe.governorate}>
              <select
                id="co-governorate"
                name="governorate"
                className="qo-input"
                autoComplete="address-level1"
                required
                defaultValue={v.governorate ?? ""}
              >
                <option value="" disabled>
                  اختر المحافظة
                </option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="المدينة أو المنطقة" name="area" error={fe.area}>
              <input
                id="co-area"
                name="area"
                className="qo-input"
                autoComplete="address-level2"
                maxLength={80}
                required
                defaultValue={v.area ?? ""}
              />
            </Field>
          </div>
          <Field label="العنوان التفصيلي" name="address" error={fe.address}>
            <textarea
              id="co-address"
              name="address"
              className="qo-input"
              rows={3}
              maxLength={300}
              autoComplete="street-address"
              required
              defaultValue={v.address ?? ""}
            />
          </Field>
          <Field label="أقرب نقطة دالة" name="landmark" error={fe.landmark}>
            <input
              id="co-landmark"
              name="landmark"
              className="qo-input"
              maxLength={150}
              defaultValue={v.landmark ?? ""}
            />
          </Field>
          <Field label="ملاحظات إضافية (اختياري)" name="notes" error={fe.notes}>
            <textarea
              id="co-notes"
              name="notes"
              className="qo-input"
              rows={2}
              maxLength={500}
              defaultValue={v.notes ?? ""}
            />
          </Field>
        </section>

        <section className="qo-card">
          <h2>طريقة الدفع</h2>
          <div className="qo-pay">
            {(["cod", "manual", "qi_card"] as const).map((m) => (
              <label key={m} className="qo-radio">
                <input
                  type="radio"
                  name="payment_method"
                  value={m}
                  defaultChecked={(v.payment_method ?? "cod") === m}
                  onChange={() => setPm(m)}
                  disabled={m === "qi_card" && (!signedIn || !qiEnabled)}
                />
                <span>
                  <strong>{PAYMENT_METHOD_LABEL[m]}</strong>
                  <span className="qo-hint" style={{ display: "block" }}>
                    {m === "cod" ? "تدفع المبلغ عند استلام الطلب." : m === "qi_card" ? (!signedIn ? "سجّل دخولك لاستخدام هذه الطريقة." : !qiEnabled ? "هذه الطريقة غير مفعّلة حالياً." : "حوّل المبلغ من تطبيق Qi Card، وتظهر لك بيانات التحويل بعد تأكيد الطلب.") : "يتواصل معك المتجر للاتفاق على طريقة الدفع."}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {fe.payment_method ? (
            <p className="qo-err" role="alert">
              {fe.payment_method}
            </p>
          ) : null}
        </section>
      </div>

      <aside className="qo-card" aria-label="ملخص الطلب">
        <h2>ملخص الطلب</h2>
        <ul className="qo-lines">
          {valid.map((l) => (
            <li key={l.key} className="qo-li">
              <span className="qo-li-img">
                {l.image ? (
                  <img src={l.image} alt={l.name} loading="lazy" decoding="async" />
                ) : (
                  <span className="qm-noimg qm-logo">QUEEN</span>
                )}
              </span>
              <div>
                <p className="qo-li-name">{l.name}</p>
                {l.label ? <p className="qo-li-sub">{l.label}</p> : null}
                <p className="qo-li-sub">
                  {l.qty} × {formatPrice(l.unitPrice)}
                </p>
              </div>
              <strong>{formatPrice(l.unitPrice * l.qty)}</strong>
            </li>
          ))}
        </ul>
        {invalid > 0 ? (
          <p className="qo-err" style={{ marginBottom: 10 }}>
            في السلة منتجات غير متاحة. <Link href="/cart">ارجع إلى السلة</Link> وأزلها للمتابعة.
          </p>
        ) : null}
        <div className="qo-row">
          <span>المجموع الفرعي</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
          {discount > 0 ? (
            <div className="qo-row">
              <span>خصم الكوبون</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          ) : null}
        <div className="qo-row">
          <span>التوصيل</span>
          <span>{fee === null ? "يُحدد عند التأكيد" : fee === 0 ? "مجاني" : formatPrice(fee)}</span>
        </div>
        <div className="qo-row qo-total">
          <span>{fee === null ? "الإجمالي (دون التوصيل)" : "الإجمالي المتوقع"}</span>
          <strong>{formatPrice(fee === null ? subtotal - discount : subtotal - discount + fee)}</strong>
        </div>
        <p className="qo-hint" style={{ marginTop: 8 }}>
          المبلغ النهائي يُحسب على الخادم من الأسعار الحالية ويظهر في صفحة الطلب بعد التأكيد.
        </p>
        <div className="qo-field" style={{ marginTop: 10 }}>
            <label htmlFor="co-coupon">كود الخصم (اختياري)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="co-coupon"
                className="qo-input"
                dir="ltr"
                maxLength={40}
                autoComplete="off"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
              />
              <button type="button" className="qm-btn" onClick={applyCoupon} disabled={couponBusy}>
                {couponBusy ? "..." : "تطبيق"}
              </button>
            </div>
            {couponMsg ? <p className="qo-err" role="alert">{couponMsg}</p> : null}
            {applied && applied.sub === subtotal ? <p className="qo-hint">تم تطبيق الكود {applied.code}</p> : null}
            {applied && applied.sub !== subtotal ? <p className="qo-hint">تغيّرت السلة، أعد تطبيق الكود.</p> : null}
          </div>
          <Submit disabled={!canOrder} />
        <p className="qo-hint" style={{ marginTop: 12, textAlign: "center" }}>
          <Link href="/cart">العودة إلى السلة</Link> · <Link href="/track">تتبع طلب سابق</Link>
        </p>
      </aside>
    </form>
  );
}
