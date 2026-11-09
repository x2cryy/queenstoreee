import { createClient } from "../supabase/server";
import { PAYMENT_STATUS_LABEL, statusLabel } from "../shop/orders";

export const LIVE_STATUSES = [
  "new",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

export type LiveOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  governorate: string | null;
  area: string | null;
  has_notes: boolean;
  pieces: number;
  lines: number;
  is_today: boolean;
  status_label: string;
  pay_label: string;
};

export type LiveResult = { ok: true; orders: LiveOrder[] } | { ok: false };

type Raw = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  governorate: string | null;
  area: string | null;
  notes: string | null;
};

const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

export async function fetchLiveOrders(): Promise<LiveResult> {
  try {
    const sb = await createClient();
    const { data, error } = await sb
      .from("orders")
      .select(
        "id,order_number,customer_name,phone,total,status,payment_status,created_at,governorate,area,notes",
      )
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { ok: false };
    const rows = (data ?? []) as unknown as Raw[];

    const counts = new Map<string, { pieces: number; lines: number }>();
    if (rows.length > 0) {
      const it = await sb
        .from("order_items")
        .select("order_id,quantity")
        .in("order_id", rows.map((r) => r.id));
      if (it.error) return { ok: false };
      for (const r of (it.data ?? []) as { order_id: string; quantity: number }[]) {
        const c = counts.get(r.order_id) ?? { pieces: 0, lines: 0 };
        c.pieces += Number(r.quantity) || 0;
        c.lines += 1;
        counts.set(r.order_id, c);
      }
    }

    const today = dayKey(new Date());
    const orders: LiveOrder[] = rows.map((r) => {
      const c = counts.get(r.id) ?? { pieces: 0, lines: 0 };
      return {
        id: r.id,
        order_number: r.order_number,
        customer_name: r.customer_name,
        phone: r.phone,
        total: Number(r.total) || 0,
        status: r.status,
        payment_status: r.payment_status,
        created_at: r.created_at,
        governorate: r.governorate,
        area: r.area,
        has_notes: !!(r.notes && r.notes.trim()),
        pieces: c.pieces,
        lines: c.lines,
        is_today: dayKey(new Date(r.created_at)) === today,
        status_label: statusLabel(r.status),
        pay_label: PAYMENT_STATUS_LABEL[r.payment_status] ?? r.payment_status,
      };
    });
    return { ok: true, orders };
  } catch {
    return { ok: false };
  }
}
