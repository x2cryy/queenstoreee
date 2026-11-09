export type MsgType = "text" | "image" | "voice" | "product" | "order" | "receipt";
export type Role = "customer" | "admin";
export type ChatMessage = {
  id: string; chat_id: string; sender_type: Role; sender_id: string | null;
  message_type: MsgType; body: string | null; media_path: string | null;
  media_duration_seconds: number | null; product_id: string | null;
  order_id: string | null; receipt_id: string | null; is_read: boolean;
  read_at: string | null; created_at: string; _state?: "sending" | "failed";
};
export type ChatRow = {
  id: string; customer_id: string; status: string; kind: string;
  order_id: string | null; product_id: string | null;
  last_message_at: string | null; last_message_preview: string | null;
  customer_unread_count: number; admin_unread_count: number; created_at: string;
  order?: { order_number: string | null } | null;
  product?: { name: string } | null;
  customer?: { full_name: string | null; phone: string | null; user_id: string | null } | null;
};
export const MSG_COLS =
  "id,chat_id,sender_type,sender_id,message_type,body,media_path,media_duration_seconds,product_id,order_id,receipt_id,is_read,read_at,created_at";
export const CHAT_SELECT =
  "id,customer_id,status,kind,order_id,product_id,last_message_at,last_message_preview,customer_unread_count,admin_unread_count,created_at,order:orders(order_number),product:products(name),customer:customers(full_name,phone,user_id)";
export const KIND_AR: Record<string, string> = {
  general: "استفسار عام", order: "بخصوص طلب", product: "استفسار عن منتج", support: "دعم",
};
export const STATUS_AR: Record<string, string> = {
  new: "جديد", pending: "قيد الانتظار", confirmed: "مؤكد", processing: "قيد التجهيز",
  shipped: "تم الشحن", out_for_delivery: "خرج للتوصيل", delivered: "تم التسليم",
  cancelled: "ملغي", returned: "مرتجع",
};
export const fmtMoney = (n: number | string | null | undefined) =>
  `${Number(n ?? 0).toLocaleString("en-US")} IQD`;
export function fmtClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
export function fmtListTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? fmtClock(iso) : `${d.getDate()}/${d.getMonth() + 1}`;
}
