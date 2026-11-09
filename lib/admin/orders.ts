import { formatPrice } from "../shop/format";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, statusLabel } from "../shop/orders";

export type StatusGroup = "all" | "new" | "processing" | "done" | "cancelled" | "returned";

export const STATUS_GROUPS: { key: StatusGroup; label: string; statuses: string[] | null }[] = [
  { key: "all", label: "جميع الطلبات", statuses: null },
  { key: "new", label: "الجديدة", statuses: ["new", "pending_confirmation"] },
  {
    key: "processing",
    label: "قيد المعالجة",
    statuses: ["confirmed", "preparing", "ready", "out_for_delivery"],
  },
  { key: "done", label: "المكتملة", statuses: ["delivered"] },
  { key: "cancelled", label: "الملغاة", statuses: ["cancelled"] },
  { key: "returned", label: "المرتجعة", statuses: ["returned"] },
];

// يطابق set_order_status في قاعدة البيانات. القاعدة هي المرجع النهائي.
export const NEXT_STATUSES: Record<string, string[]> = {
  new: ["pending_confirmation", "confirmed", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["returned"],
};

// الحالات التي يسمح فيها set_order_delivery بتعديل التوصيل.
export const DELIVERY_EDITABLE = ["new", "pending_confirmation", "confirmed", "preparing", "ready"];

export type AdminActionState = { ok: boolean; message?: string };

const ADMIN_ERRORS: Record<string, string> = {
  order_has_debt: "الطلب مرتبط بدين أو قسط، ألغِ الدين أولاً ثم أعد المحاولة.",
  forbidden: "ليست لديك صلاحية لهذه العملية.",
  not_found: "الطلب غير موجود.",
  invalid_transition: "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية.",
  reason_required: "اكتب سبباً واضحاً (3 أحرف على الأقل).",
  invalid_note: "الملاحظة فارغة أو طويلة جداً (حتى 1000 حرف).",
  invalid_amount: "المبلغ غير صالح.",
  invalid_payment: "طريقة الدفع غير صالحة.",
  order_closed: "الطلب مغلق: لا يمكن تعديل التوصيل أو تسجيل دفعة عليه.",
  payment_exceeds_total: "الدفعات ستتجاوز إجمالي الطلب.",
};

export function adminErrorMessage(code: string | undefined): string {
  return ADMIN_ERRORS[(code ?? "").trim()] ?? "تعذر تنفيذ العملية. حاول مجدداً.";
}

// يحوّل رقماً محلياً (07...) إلى صيغة wa.me الدولية للعراق.
export function waNumber(phone: string): string | null {
  let d = phone.replace(/[^0-9]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "964" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export type SummaryOrder = {
  order_number: string;
  status: string;
  customer_name: string;
  phone: string;
  governorate: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  total: number;
  payment_method: string;
  payment_status: string;
  items: { product_name: string; variant_label: string | null; quantity: number }[];
  discount_total?: number;
  delivery_fee?: number;
  paid?: number;
  remaining?: number;
};

export function whatsappSummary(o: SummaryOrder): string {
  const place = [o.governorate, o.area].filter(Boolean).join("، ");
  const lines = [
    `طلب ${o.order_number} - QUEEN STORE`,
    `الحالة: ${statusLabel(o.status)}`,
    "",
    `الاسم: ${o.customer_name}`,
    `الهاتف: ${o.phone}`,
  ];
  if (place) lines.push(`المنطقة: ${place}`);
  if (o.address) lines.push(`العنوان: ${o.address}`);
  if (o.landmark) lines.push(`أقرب نقطة دالة: ${o.landmark}`);
  lines.push("", "المنتجات:");
  for (const i of o.items) {
    lines.push(`- ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`);
  }
  lines.push("", `الإجمالي: ${formatPrice(o.total)}`);
  lines.push(
    `الدفع: ${PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method} (${PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status})`
  );
  if (o.discount_total && o.discount_total > 0) lines.push(`الخصم: ${formatPrice(o.discount_total)}`);
  if (o.delivery_fee && o.delivery_fee > 0) lines.push(`التوصيل: ${formatPrice(o.delivery_fee)}`);
  if (typeof o.paid === "number") lines.push(`المدفوع: ${formatPrice(o.paid)}`);
  if (typeof o.remaining === "number") lines.push(`المتبقي: ${formatPrice(o.remaining)}`);
  return lines.join("\n");
}
