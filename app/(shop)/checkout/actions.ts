"use server";

import { getQiEnabled } from "../../../lib/shop/qi";
import { createClient } from "../../../lib/supabase/server";
import { rateLimit } from "../../../lib/auth/rate-limit";
import {
  ORDER_FIELD_OF,
  normalizePhone,
  orderErrorMessage,
  type PlaceOrderState,
} from "../../../lib/shop/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Item = { product_id: string; variant_id: string | null; qty: number };

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

function parseItems(raw: string): Item[] | null {
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length < 1 || arr.length > 50) return null;
    const out: Item[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const pid = o.productId;
      const vid = o.variantId;
      const qty = Math.floor(Number(o.qty));
      if (typeof pid !== "string" || !UUID.test(pid)) return null;
      if (vid != null && (typeof vid !== "string" || !UUID.test(vid))) return null;
      if (!Number.isFinite(qty) || qty < 1 || qty > 999) return null;
      out.push({ product_id: pid, variant_id: typeof vid === "string" ? vid : null, qty });
    }
    return out;
  } catch {
    return null;
  }
}

export async function placeOrder(
  _prev: PlaceOrderState,
  formData: FormData
): Promise<PlaceOrderState> {
  const values: Record<string, string> = {
    full_name: text(formData.get("full_name")),
    phone: text(formData.get("phone")),
    governorate: text(formData.get("governorate")),
    area: text(formData.get("area")),
    address: text(formData.get("address")),
    landmark: text(formData.get("landmark")),
    notes: text(formData.get("notes")),
    payment_method: text(formData.get("payment_method")) || "cod",
  };
  const key = text(formData.get("idem"));
  const items = parseItems(text(formData.get("items")));
  const phone = normalizePhone(values.phone);
  const coupon = text(formData.get("coupon")).toUpperCase().slice(0, 40);

  const fe: Record<string, string> = {};
  if (values.full_name.length < 2 || values.full_name.length > 80) fe.full_name = "أدخل الاسم الكامل.";
  if (!/^(\+[0-9]{7,14}|[0-9]{7,15})$/.test(phone)) {
    fe.phone = "رقم الهاتف غير صحيح. أدخل أرقاماً فقط، مثال: 07701234567";
  }
  if (values.governorate.length < 2 || values.governorate.length > 40) fe.governorate = "اختر المحافظة.";
  if (values.area.length < 2 || values.area.length > 80) fe.area = "أدخل المدينة أو المنطقة.";
  if (values.address.length < 5 || values.address.length > 300) fe.address = "اكتب العنوان بالتفصيل (5 أحرف على الأقل).";
  if (values.landmark.length > 150) fe.landmark = "أقرب نقطة دالة طويلة جداً.";
  if (values.notes.length > 500) fe.notes = "الملاحظات طويلة جداً (500 حرف كحد أقصى).";
  if (values.payment_method !== "cod" && values.payment_method !== "manual" && values.payment_method !== "qi_card") fe.payment_method = "اختر طريقة دفع.";
  if (Object.keys(fe).length > 0) {
    return { ok: false, message: "راجع الحقول المحددة.", fieldErrors: fe, values };
  }
  if (!items || key.length < 16 || key.length > 80) {
    return { ok: false, message: orderErrorMessage("invalid_request"), values };
  }
  if (!(await rateLimit("checkout", 8, 10 * 60 * 1000))) {
    return { ok: false, message: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.", values };
  }

  if (values.payment_method === "qi_card" && !(await getQiEnabled())) {
    return {
      ok: false,
      message: "الدفع عبر Qi Card غير مفعّل حالياً، اختر طريقة دفع أخرى.",
      fieldErrors: { payment_method: "اختر طريقة دفع أخرى." },
      values,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_idempotency_key: key,
    p_customer_name: values.full_name,
    p_phone: phone,
    p_governorate: values.governorate,
    p_area: values.area,
    p_address: values.address,
    p_landmark: values.landmark || null,
    p_notes: values.notes || null,
    p_payment_method: values.payment_method,
    p_items: items,
      p_coupon_code: coupon || null,
  });

  if (error) {
    const code = (error.message ?? "").trim();
    if (code === "coupon_invalid") {
      return {
        ok: false,
        message: "كود الخصم غير صالح أو منتهي. احذفه أو جرّب كوداً آخر.",
        values,
      };
    }
    const field = ORDER_FIELD_OF[code];
    return {
      ok: false,
      message: orderErrorMessage(code, error.details),
      fieldErrors: field ? { [field]: orderErrorMessage(code) } : undefined,
      values,
    };
  }

  const r = data as { order_number?: string; public_token?: string } | null;
  if (!r?.public_token) {
    return { ok: false, message: orderErrorMessage("unknown"), values };
  }
  return { ok: true, token: r.public_token, orderNumber: r.order_number };
}


export async function previewCoupon(
  code: string,
  subtotal: number
): Promise<
  | { ok: true; code: string; discount: number }
  | { ok: false; message: string }
> {
  const c = String(code ?? "").trim().toUpperCase().slice(0, 40);
  const sub = Math.floor(Number(subtotal));
  if (!c || !Number.isFinite(sub) || sub <= 0) {
    return { ok: false, message: "كود الخصم غير صالح." };
  }
  if (!(await rateLimit("coupon", 15, 10 * 60 * 1000))) {
    return { ok: false, message: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: c,
    p_subtotal: sub,
  });
  if (error || !data) {
    return { ok: false, message: "تعذر التحقق من الكود. حاول مرة أخرى." };
  }
  const d = data as {
    valid: boolean;
    reason?: string;
    discount?: number;
    code?: string;
    min_order?: number;
  };
  if (d.valid) {
    return { ok: true, code: d.code ?? c, discount: Number(d.discount ?? 0) };
  }
  const msgs: Record<string, string> = {
    expired: "هذا الكود منتهي الصلاحية.",
    not_started: "هذا الكود لم يبدأ بعد.",
    used_up: "انتهى عدد مرات استخدام هذا الكود.",
    min_order:
      "الحد الأدنى للطلب لاستخدام هذا الكود هو " +
      Number(d.min_order ?? 0).toLocaleString("en-US") +
      ".",
  };
  return { ok: false, message: msgs[d.reason ?? ""] ?? "كود الخصم غير صالح." };
}
