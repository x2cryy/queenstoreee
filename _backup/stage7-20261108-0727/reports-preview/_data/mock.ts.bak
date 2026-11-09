import { addDays, diffDays, previousPeriod, type Period } from "../_lib/utils";

export const MOCK_LABEL = "بيانات تجريبية — لا تمثل حسابات المتجر";

export type PreviewMode = "data" | "empty" | "loading" | "error";
export type StatusKey = "done" | "processing" | "cancelled" | "returned";
export type DayPoint = { date: string; netSales: number; collected: number; orders: number; profit: number };
export type Totals = { netSales: number; profit: number; collected: number; orders: number };
export type ChartPoint = { start: string; end: string; netSales: number; collected: number };
export type StatusRow = { key: StatusKey; label: string; count: number };
export type OrderSample = { id: number; customer: string; date: string; amount: number };
export type TopProduct = { name: string; qty: number; sales: number };
export type AttentionKind = "missing_cost" | "late_installments" | "pending_orders" | "low_stock";
export type AttentionItem = { kind: AttentionKind; count: number };

export type Report = {
  period: Period;
  previous: Period;
  cur: Totals;
  prev: Totals;
  daily: DayPoint[];
  chart: ChartPoint[];
  missingCostItems: number;
  statuses: StatusRow[];
  samples: Record<StatusKey, OrderSample[]>;
  topProducts: TopProduct[];
  attention: AttentionItem[];
};

// مولّد أرقام عشوائية ثابتة: نفس التاريخ يعطي نفس الأرقام دائمًا
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r250 = (n: number) => Math.round(n / 250) * 250;

const STATUS_LABEL: Record<StatusKey, string> = {
  done: "مكتملة",
  processing: "قيد التجهيز",
  cancelled: "ملغاة",
  returned: "مرتجعة",
};
const STATUS_ORDER: StatusKey[] = ["done", "processing", "cancelled", "returned"];

const CUSTOMERS = ["أحمد الكعبي", "سارة الجبوري", "علي الموسوي", "زينب العبيدي", "محمد التميمي", "نور الساعدي", "حسين الربيعي", "مريم الخفاجي"];

const PRODUCTS = [
  { name: "حقيبة يد جلدية", price: 185_000, share: 0.16 },
  { name: "حذاء رياضي", price: 120_000, share: 0.14 },
  { name: "عطر نسائي 100 مل", price: 95_000, share: 0.15 },
  { name: "ساعة يد", price: 210_000, share: 0.08 },
  { name: "وشاح حرير", price: 45_000, share: 0.13 },
  { name: "نظارة شمسية", price: 75_000, share: 0.1 },
  { name: "محفظة جلدية", price: 60_000, share: 0.12 },
  { name: "حزام رجالي", price: 40_000, share: 0.09 },
];

function makeDay(date: string): DayPoint {
  const rnd = mulberry(hash(`day:${date}`));
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  const factor = dow === 5 ? 0.7 : dow === 4 ? 1.25 : 1;
  const orders = Math.round((14 + rnd() * 22) * factor);
  const gross = orders * (38_000 + rnd() * 42_000);
  const netSales = r250(gross * 0.935); // بعد الخصومات والمرتجعات
  const collected = r250(netSales * (0.55 + rnd() * 0.4));
  const profit = r250(netSales * (0.18 + rnd() * 0.1)); // يستثني المنتجات بلا تكلفة
  return { date, orders, netSales, collected, profit };
}

function daysOf(from: string, to: string): DayPoint[] {
  const out: DayPoint[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(makeDay(addDays(from, i)));
  return out;
}

const sumDays = (days: DayPoint[]): Totals =>
  days.reduce(
    (t, d) => ({
      netSales: t.netSales + d.netSales,
      profit: t.profit + d.profit,
      collected: t.collected + d.collected,
      orders: t.orders + d.orders,
    }),
    { netSales: 0, profit: 0, collected: 0, orders: 0 },
  );

export function getMockReport(period: Period, empty = false): Report {
  const previous = previousPeriod(period);
  const daily = empty ? [] : daysOf(period.from, period.to);
  const prevDaily = empty ? [] : daysOf(previous.from, previous.to);
  const cur = sumDays(daily);
  const prev = sumDays(prevDaily);
  const len = diffDays(period.from, period.to) + 1;

  // أكثر من 31 يومًا: نجمع في أسابيع حتى لا يزدحم الرسم
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

  const total = cur.orders;
  const cancelled = Math.round(total * 0.06);
  const returned = Math.round(total * 0.04);
  const processing = Math.round(total * 0.12);
  const counts: Record<StatusKey, number> = {
    done: Math.max(0, total - cancelled - returned - processing),
    processing,
    cancelled,
    returned,
  };
  const statuses: StatusRow[] = STATUS_ORDER.map((key) => ({ key, label: STATUS_LABEL[key], count: counts[key] }));

  const samples = {} as Record<StatusKey, OrderSample[]>;
  for (const s of statuses) {
    const rnd = mulberry(hash(`s:${s.key}:${period.from}:${period.to}`));
    const list: OrderSample[] = [];
    for (let i = 0; i < Math.min(5, s.count); i++) {
      list.push({
        id: 1000 + Math.floor(rnd() * 9000),
        customer: CUSTOMERS[Math.floor(rnd() * CUSTOMERS.length)],
        date: addDays(period.from, Math.floor(rnd() * len)),
        amount: r250(25_000 + rnd() * 180_000),
      });
    }
    samples[s.key] = list.sort((a, b) => b.date.localeCompare(a.date));
  }

  const topProducts: TopProduct[] = empty
    ? []
    : PRODUCTS.map((p) => {
        const rnd = mulberry(hash(`p:${p.name}:${period.from}:${period.to}`));
        const qty = Math.round(cur.orders * p.share * (0.85 + rnd() * 0.3));
        return { name: p.name, qty, sales: r250(qty * p.price) };
      })
        .filter((p) => p.qty > 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

  const attention: AttentionItem[] = empty
    ? []
    : [
        { kind: "missing_cost", count: 3 },
        { kind: "late_installments", count: 2 },
        { kind: "pending_orders", count: 4 },
        { kind: "low_stock", count: 5 },
      ];

  return {
    period,
    previous,
    cur,
    prev,
    daily,
    chart,
    missingCostItems: empty ? 0 : 3,
    statuses,
    samples,
    topProducts,
    attention,
  };
}
