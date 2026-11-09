import type { Period } from "./utils";

export type StatusKey = "done" | "processing" | "cancelled" | "returned";
export type StatusRow = { key: StatusKey; label: string; count: number };
export type DayPoint = { date: string; netSales: number; collected: number; orders: number };
export type ChartPoint = { start: string; end: string; netSales: number; collected: number };
export type TopProduct = { id: string | null; name: string; qty: number; sales: number };
export type AttentionKind = "missing_cost" | "qi_pending" | "pending_orders";
export type AttentionItem = { kind: AttentionKind; count: number };

export type Detail = {
  ordersTotal: number;
  ordersDone: number;
  ordersProcessing: number;
  ordersCancelled: number;
  ordersReturned: number;
  ordersDelivered: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  deliveryFees: number;
  collected: number;
  collectedOrders: number;
  collectedQi: number;
  collectedDebts: number;
  collectedInstallments: number;
  refunded: number;
  cogsKnown: number | null;
  revenueCosted: number | null;
  itemsTotal: number | null;
  itemsMissing: number | null;
  grossProfitKnown: number | null;
  coveragePct: number | null;
};

export type Report = {
  period: Period;
  previous: Period;
  cur: Detail;
  prev: Detail;
  daily: DayPoint[];
  chart: ChartPoint[];
  statuses: StatusRow[];
  topProducts: TopProduct[];
  attention: AttentionItem[];
  costsVisible: boolean;
  includesDebts: boolean;
  includesInstallments: boolean;
};
