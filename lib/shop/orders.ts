export const ORDER_STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  pending_confirmation: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  preparing: "قيد التجهيز",
  ready: "جاهز للتوصيل",
  out_for_delivery: "قيد التوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "غير مدفوع",
  paid: "مدفوع",
  partial: "مدفوع جزئياً",
  failed: "فشلت عملية الدفع",
  refunded: "مسترد",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  manual: "الدفع بالاتفاق مع المتجر",
  qi_card: "تحويل يدوي عبر Qi Card",
};

export const statusLabel = (s: string) => ORDER_STATUS_LABEL[s] ?? s;

export const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "السليمانية", "دهوك", "كركوك", "الأنبار", "بابل",
  "كربلاء", "النجف", "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين", "ديالى",
] as const;

export type OrderItemJson = {
  product_name: string;
  variant_label: string | null;
  image_path: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderJson = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  phone: string;
  governorate: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  notes: string | null;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  delivered_at: string | null;
  cancel_reason: string | null;
  return_reason: string | null;
  items: OrderItemJson[];
  history: { status: string; at: string }[];
};

export type PlaceOrderState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  token?: string;
  orderNumber?: string;
};

export type TrackState = {
  ok: boolean;
  message?: string;
  values?: { order_number: string; phone: string };
  order?: OrderJson;
};

export const ORDER_FIELD_OF: Record<string, string> = {
  invalid_name: "full_name",
  invalid_phone: "phone",
  invalid_governorate: "governorate",
  invalid_area: "area",
  invalid_address: "address",
  invalid_landmark: "landmark",
  invalid_notes: "notes",
};

const ORDER_ERRORS: Record<string, string> = {
  invalid_request: "تعذر إرسال الطلب. أعد تحميل الصفحة وحاول مجدداً.",
  blocked: "لا يمكن إنشاء طلبات من هذا الحساب حالياً. تواصل مع المتجر.",
  invalid_name: "الاسم غير صالح. أدخل الاسم الكامل.",
  invalid_phone: "رقم الهاتف غير صحيح.",
  invalid_governorate: "اختر المحافظة.",
  invalid_area: "أدخل المدينة أو المنطقة.",
  invalid_address: "العنوان قصير جداً. اكتب عنواناً تفصيلياً.",
  invalid_landmark: "أقرب نقطة دالة طويلة جداً.",
  invalid_notes: "الملاحظات طويلة جداً.",
  invalid_payment: "اختر طريقة دفع صحيحة.",
  invalid_items: "السلة غير صالحة. راجع المنتجات وحاول مجدداً.",
  unavailable: "أحد المنتجات لم يعد متاحاً. راجع السلة.",
  out_of_stock: "الكمية المطلوبة غير متوفرة حالياً. راجع السلة.",
  login_required: "الدفع عبر Qi Card يتطلب تسجيل الدخول.",
  variant_required: "يجب اختيار خيارات المنتج. راجع السلة.",
};

export function orderErrorMessage(code: string | undefined, detail?: string | null): string {
  const base = ORDER_ERRORS[code ?? ""] ?? "تعذر إنشاء الطلب. حاول مجدداً بعد قليل.";
  if (detail && (code === "out_of_stock" || code === "unavailable" || code === "variant_required")) {
    return `${base} (${detail})`;
  }
  return base;
}

// يحوّل الأرقام العربية والفارسية إلى لاتينية ويحذف المسافات والرموز.
export function normalizePhone(raw: string): string {
  return raw
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
      const c = d.charCodeAt(0);
      return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
    })
    .replace(/[\s()\-.]/g, "");
}

export const formatOrderDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
