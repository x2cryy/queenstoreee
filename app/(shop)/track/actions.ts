"use server";

import { createPublicClient } from "../../../lib/shop/client";
import { rateLimit } from "../../../lib/auth/rate-limit";
import { normalizePhone, type OrderJson, type TrackState } from "../../../lib/shop/orders";

export async function lookupOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const number = String(formData.get("order_number") ?? "").trim().slice(0, 40);
  const rawPhone = String(formData.get("phone") ?? "").trim().slice(0, 20);
  const values = { order_number: number, phone: rawPhone };
  const phone = normalizePhone(rawPhone);

  if (!number) return { ok: false, message: "أدخل رقم الطلب.", values };
  if (phone.replace(/\D/g, "").length < 7) {
    return { ok: false, message: "أدخل رقم الهاتف المستخدم في الطلب.", values };
  }
  if (!(await rateLimit("track", 6, 10 * 60 * 1000))) {
    return { ok: false, message: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.", values };
  }

  const sb = createPublicClient();
  const { data, error } = await sb.rpc("lookup_guest_order", {
    p_order_number: number,
    p_phone: phone,
  });
  if (error) return { ok: false, message: "تعذر البحث الآن. حاول بعد قليل.", values };
  if (!data) {
    return {
      ok: false,
      message: "لم نجد طلباً بهذه البيانات. تأكد من رقم الطلب ورقم الهاتف.",
      values,
    };
  }
  return { ok: true, order: data as OrderJson, values };
}
