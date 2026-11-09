import { previousPeriod, type Period } from "./utils";
import type { AttentionItem, ChartPoint, DayPoint, Detail, Report, StatusKey, StatusRow, TopProduct } from "./types";

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const nul = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

export const STATUS_LABELS: Record<StatusKey, string> = {
  done: "مكتملة",
  processing: "قيد المعالجة",
  cancelled: "ملغاة",
  returned: "مرتجعة",
};

function detail(o: Raw): Detail {
  return {
    ordersTotal: num(o.orders_total),
    ordersDone: num(o.orders_done),
    ordersProcessing: num(o.orders_processing),
    ordersCancelled: num(o.orders_cancelled),
    ordersReturned: num(o.orders_returned),
    ordersDelivered: num(o.orders_delivered),
    grossSales: num(o.gross_sales),
    discounts: num(o.discounts),
    netSales: num(o.net_sales),
    deliveryFees: num(o.delivery_fees),
    collected: num(o.collected),
    collectedOrders: num(o.collected_orders),
    collectedQi: num(o.collected_qi),
    collectedDebts: num(o.collected_debts),
    collectedInstallments: num(o.collected_installments),
    refunded: num(o.refunded),
    cogsKnown: nul(o.cogs_known),
    revenueCosted: nul(o.revenue_costed),
    itemsTotal: nul(o.items_total),
    itemsMissing: nul(o.items_missing_cost),
    grossProfitKnown: nul(o.gross_profit_known),
    coveragePct: nul(o.cost_coverage_pct),
  };
}

export function toReport(raw: unknown, period: Period): Report | null {
  const r = obj(raw);
  if (!r.current || !r.previous) return null;
  const cur = detail(obj(r.current));
  const prev = detail(obj(r.previous));

  const daily: DayPoint[] = (Array.isArray(r.daily) ? r.daily : []).map((x: unknown) => {
    const o = obj(x);
    return { date: String(o.date ?? ""), netSales: num(o.net_sales), collected: num(o.collected), orders: num(o.orders) };
  });

  // أكثر من 31 يوما: نجمع في أسابيع حتى لا يزدحم الرسم
  const size = daily.length > 31 ? 7 : 1;
  const chart: ChartPoint[] = [];
  for (let i = 0; i < daily.length; i += size) {
    const part = daily.slice(i, i + size);
    chart.push({
      start: part[0].date,
      end: part[part.length - 1].date,
      netSales: part.reduce((s, d) => s + d.netSales, 0),
      collected: part.reduce((s, d) => s + d.collected, 0),
    });
  }

  const statuses: StatusRow[] = [
    { key: "done", label: STATUS_LABELS.done, count: cur.ordersDone },
    { key: "processing", label: STATUS_LABELS.processing, count: cur.ordersProcessing },
    { key: "cancelled", label: STATUS_LABELS.cancelled, count: cur.ordersCancelled },
    { key: "returned", label: STATUS_LABELS.returned, count: cur.ordersReturned },
  ];

  const topProducts: TopProduct[] = (Array.isArray(r.top_products) ? r.top_products : []).map((x: unknown) => {
    const o = obj(x);
    return { id: o.product_id ? String(o.product_id) : null, name: String(o.name ?? "-"), qty: num(o.qty), sales: num(o.sales) };
  });

  const costsVisible = r.costs_visible === true;
  const attention: AttentionItem[] = [];
  const missing = costsVisible ? (cur.itemsMissing ?? 0) : 0;
  if (missing > 0) attention.push({ kind: "missing_cost", count: missing });
  if (num(r.qi_pending) > 0) attention.push({ kind: "qi_pending", count: num(r.qi_pending) });
  if (num(r.orders_new) > 0) attention.push({ kind: "pending_orders", count: num(r.orders_new) });

  return {
    period,
    previous: previousPeriod(period),
    cur,
    prev,
    daily,
    chart,
    statuses,
    topProducts,
    attention,
    costsVisible,
    includesDebts: r.includes_debts === true,
    includesInstallments: r.includes_installments === true,
  };
}
