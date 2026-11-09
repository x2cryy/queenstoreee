import { cache } from "react";
import { createClient } from "../supabase/server";
import { fetchAll } from "./dashboard";

const TZ = "Asia/Baghdad";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type DayPoint = { date: string; label: string; total: number; count: number };
export type Breakdown = { key: string; label: string; value: number };
export type TopProduct = { key: string; name: string; qty: number };

export type ChartsData = {
  days: DayPoint[] | null;
  statuses: Breakdown[] | null;
  payments: Breakdown[] | null;
  top: TopProduct[] | null;
};

export const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const PAYMENT_LABELS: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  manual: "دفع يدوي",
  qi_card: "بطاقة كي",
};

type OrderRow = { total: number; created_at: string; status: string; payment_method: string };
type ItemRow = { product_id: string | null; product_name: string; quantity: number };

export const getCharts = cache(async (): Promise<ChartsData> => {
  const supabase = await createClient();

  const [ordersRes, itemsRes] = await Promise.allSettled([
    fetchAll<OrderRow>((f, t) =>
      supabase.from("orders").select("total, created_at, status, payment_method").order("id").range(f, t)
    ),
    fetchAll<ItemRow>((f, t) =>
      supabase
        .from("order_items")
        .select("product_id, product_name, quantity, orders!inner(status)")
        .neq("orders.status", "cancelled")
        .order("id")
        .range(f, t)
    ),
  ]);

  let days: DayPoint[] | null = null;
  let statuses: Breakdown[] | null = null;
  let payments: Breakdown[] | null = null;
  let top: TopProduct[] | null = null;

  if (ordersRes.status === "fulfilled") {
    const orders = ordersRes.value;
    const live = orders.filter((o) => o.status !== "cancelled");

    const today = dayFmt.format(new Date());
    const base = new Date(today + "T00:00:00Z").getTime();
    const map = new Map<string, DayPoint>();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(base - i * 86400000).toISOString().slice(0, 10);
      map.set(date, {
        date,
        label: Number(date.slice(8)) + "/" + Number(date.slice(5, 7)),
        total: 0,
        count: 0,
      });
    }
    for (const o of live) {
      const p = map.get(dayFmt.format(new Date(o.created_at)));
      if (p) {
        p.total += num(o.total);
        p.count += 1;
      }
    }
    days = [...map.values()];

    statuses = Object.keys(STATUS_LABELS).map((k) => ({
      key: k,
      label: STATUS_LABELS[k],
      value: orders.filter((o) => o.status === k).length,
    }));

    payments = Object.keys(PAYMENT_LABELS).map((k) => ({
      key: k,
      label: PAYMENT_LABELS[k],
      value: live.filter((o) => o.payment_method === k).length,
    }));
  }

  if (itemsRes.status === "fulfilled") {
    const agg = new Map<string, TopProduct>();
    for (const it of itemsRes.value) {
      const key = it.product_id ?? it.product_name;
      const cur = agg.get(key) ?? { key, name: it.product_name, qty: 0 };
      cur.qty += num(it.quantity);
      agg.set(key, cur);
    }
    top = [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }

  return { days, statuses, payments, top };
});
