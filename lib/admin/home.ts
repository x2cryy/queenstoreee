import { createClient } from "../supabase/server";
import { getRole } from "../auth/session";
import { PAYMENT_STATUS_LABEL, statusLabel } from "../shop/orders";
import { getMyPermissions } from "./access";
import { fetchAll } from "./dashboard";
import type {
  FollowItem,
  HomeData,
  Metric,
  Order,
  OrdersData,
  Sec,
  StockData,
  StockItem,
} from "./home-types";

const TZ = "Asia/Baghdad";
const baghdadDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const addDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
// بغداد UTC+3 ثابتة بلا توقيت صيفي
const startOf = (iso: string) => `${iso}T00:00:00+03:00`;

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) => `\u2066${fmt(n)}\u2069 د.ع`;

const hide = <T>(): Sec<T> => ({ state: "hidden" });

async function safe<T>(run: () => Promise<T>): Promise<Sec<T>> {
  try {
    return { state: "ok", data: await run() };
  } catch {
    return { state: "error" };
  }
}
const gated = <T>(allowed: boolean, run: () => Promise<T>): Promise<Sec<T>> =>
  allowed ? safe(run) : Promise.resolve(hide<T>());

async function countOf(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

type Rpt = { cur: Record<string, unknown>; prev: Record<string, unknown> };
function fromRpt(r: Sec<Rpt>, key: string): Metric {
  if (r.state !== "ok") return r;
  return { state: "ok", data: { value: num(r.data.cur[key]), prev: num(r.data.prev[key]) || null } };
}

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string | null;
  governorate: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  notes: string | null;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  payment_status: string;
  status: string;
  created_at: string;
};
type ItemRow = {
  order_id: string;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export async function getHomeData(): Promise<HomeData> {
  const sb = await createClient();
  const isOwner = (await getRole()) === "owner";
  const perms = (await getMyPermissions()) as string[];
  const has = (k: string) => isOwner || perms.includes(k);

  const today = baghdadDate(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const canOrders = has("orders");
  const canReports = has("reports");

  // الطلبات الجديدة اليوم: كل طلب أُنشئ اليوم بتوقيت بغداد (نفس تعريف التقارير)
  const newToday = gated(canOrders, async () => {
    const day = (from: string, to: string) =>
      countOf(
        sb
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOf(from))
          .lt("created_at", startOf(to)),
      );
    const [a, b] = await Promise.all([day(today, tomorrow), day(yesterday, today)]);
    return { value: a, prev: b || null };
  });

  // قيد التجهيز: preparing + ready (قد تكون من أيام سابقة)
  const processing = gated(canOrders, async () => ({
    value: await countOf(
      sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["preparing", "ready"]),
    ),
    prev: null,
  }));

  // المبيعات والمحصل: من دالة التقارير نفسها لفترة اليوم، ومقارنتها بالأمس
  const rpt = gated(canReports, async (): Promise<Rpt> => {
    const { data, error } = await sb.rpc("rpt_overview", { p_from: today, p_to: today });
    if (error) throw error;
    const d = (data ?? {}) as { current?: Record<string, unknown>; previous?: Record<string, unknown> };
    return { cur: d.current ?? {}, prev: d.previous ?? {} };
  });

  const orders = gated(canOrders, async (): Promise<OrdersData> => {
    const [res, total] = await Promise.all([
      sb
        .from("orders")
        .select(
          "id, order_number, customer_name, phone, governorate, area, address, landmark, notes, subtotal, discount_total, delivery_fee, total, payment_status, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(5),
      countOf(sb.from("orders").select("id", { count: "exact", head: true })),
    ]);
    if (res.error) throw res.error;
    const rows = (res.data ?? []) as unknown as OrderRow[];
    const ids = rows.map((r) => r.id);

    let items: ItemRow[] = [];
    let chats: { id: string; order_id: string }[] = [];
    if (ids.length) {
      const it = await sb
        .from("order_items")
        .select("order_id, product_name, variant_label, quantity, unit_price, line_total")
        .in("order_id", ids);
      if (it.error) throw it.error;
      items = (it.data ?? []) as unknown as ItemRow[];
      if (has("chats")) {
        const ch = await sb.from("chats").select("id, order_id").in("order_id", ids);
        if (!ch.error) chats = (ch.data ?? []) as unknown as { id: string; order_id: string }[];
      }
    }

    const list: Order[] = rows.map((r) => ({
      id: r.id,
      number: r.order_number,
      customer: r.customer_name,
      createdAt: r.created_at,
      status: r.status,
      statusLabel: statusLabel(r.status),
      pay: r.payment_status,
      payLabel: PAYMENT_STATUS_LABEL[r.payment_status] ?? r.payment_status,
      phone: r.phone || null,
      place: [r.governorate, r.area].filter(Boolean).join(" - ") || null,
      address: r.address || null,
      landmark: r.landmark || null,
      notes: r.notes || null,
      subtotal: num(r.subtotal),
      discount: num(r.discount_total),
      fee: num(r.delivery_fee),
      total: num(r.total),
      items: items
        .filter((i) => i.order_id === r.id)
        .map((i) => ({
          name: i.product_name,
          option: i.variant_label,
          qty: num(i.quantity),
          unit: num(i.unit_price),
          line: num(i.line_total),
        })),
      chatId: chats.find((c) => c.order_id === r.id)?.id ?? null,
    }));
    return { list, total };
  });

  // المخزون: نفس قاعدة الرئيسية القديمة
  const stock = gated(has("products") || has("inventory"), async (): Promise<StockData> => {
    const rows = await fetchAll<{ id: string; name: string; status: string; quantity: number; low_stock_threshold: number }>(
      (f, t) =>
        sb.from("products").select("id, name, status, quantity, low_stock_threshold").order("id").range(f, t),
    );
    const itemHref = (id: string) => (has("products") ? `/admin/products/${id}` : "/admin/inventory");
    const all: StockItem[] = [];
    for (const p of rows) {
      const qty = num(p.quantity);
      const thr = num(p.low_stock_threshold);
      const base = { id: String(p.id), name: p.name, qty, threshold: thr, href: itemHref(String(p.id)) };
      if (p.status !== "hidden" && (p.status === "sold_out" || qty === 0)) all.push({ ...base, state: "out" });
      else if (p.status === "active" && qty > 0 && qty <= thr) all.push({ ...base, state: "low" });
    }
    all.sort((a, b) =>
      a.state === b.state ? a.qty - b.qty || a.name.localeCompare(b.name, "ar") : a.state === "out" ? -1 : 1,
    );
    return { items: all.slice(0, 5), total: all.length, listHref: has("inventory") ? "/admin/inventory" : "/admin/products" };
  });

  async function follow(
    key: FollowItem["key"],
    label: string,
    href: string,
    run: () => Promise<{ count: number; note: string }>,
  ): Promise<FollowItem> {
    try {
      const r = await run();
      return { key, label, href, state: "ok", count: r.count, note: r.note };
    } catch {
      return { key, label, href, state: "error", count: 0, note: "تعذّر تحميل هذا البند." };
    }
  }

  const followItems: Promise<FollowItem>[] = [];
  if (has("chats")) {
    followItems.push(
      follow("messages", "رسائل غير مقروءة", "/admin/chats", async () => {
        const rows = await fetchAll<{ admin_unread_count: number }>((f, t) =>
          sb.from("chats").select("admin_unread_count").gt("admin_unread_count", 0).order("id").range(f, t),
        );
        return {
          count: rows.reduce((s, r) => s + num(r.admin_unread_count), 0),
          note: `${fmt(rows.length)} محادثة تنتظر الرد`,
        };
      }),
    );
  }
  if (canOrders) {
    followItems.push(
      follow("qicard", "تحويلات Qi Card بانتظار المراجعة", "/admin/payments", async () => ({
        count: await countOf(
          sb.from("payments").select("id", { count: "exact", head: true }).eq("method", "qi_card").eq("status", "pending"),
        ),
        note: "تحويلات بانتظار القبول أو الرفض",
      })),
    );
  }
  if (has("store_debts")) {
    followItems.push(
      follow("store_debts", "ديون على المتجر حان موعد سدادها", "/admin/debts/store", async () => {
        const rows = await fetchAll<{ remaining_amount: number }>((f, t) =>
          sb
            .from("store_debts")
            .select("remaining_amount")
            .eq("direction", "payable")
            .in("status", ["open", "partial"])
            .lte("due_date", today)
            .order("id")
            .range(f, t),
        );
        return { count: rows.length, note: `المتبقي: ${money(rows.reduce((s, r) => s + num(r.remaining_amount), 0))}` };
      }),
    );
  }
  if (has("installments")) {
    followItems.push(
      Promise.resolve({
        key: "store_installments",
        label: "أقساط المتجر",
        href: "/admin/debts/installments",
        state: "na",
        count: 0,
        note: "غير معروضة: لا يميّز النظام بين القسط الشخصي وقسط المتجر، لذلك لا تُعرض هنا.",
      } satisfies FollowItem),
    );
  }
  const follows: Promise<Sec<FollowItem[]>> = followItems.length
    ? Promise.all(followItems).then((data) => ({ state: "ok" as const, data }))
    : Promise.resolve(hide<FollowItem[]>());

  const [nt, pr, rp, od, st, fl] = await Promise.all([newToday, processing, rpt, orders, stock, follows]);

  return {
    today,
    access: {
      products: has("products"),
      orders: canOrders,
      marketing: has("marketing"),
      personalDebts: has("personal_debts"),
      storeDebts: has("store_debts"),
      installments: has("installments"),
    },
    summary: { newToday: nt, processing: pr, sales: fromRpt(rp, "revenue"), collected: fromRpt(rp, "collected") },
    orders: od,
    stock: st,
    follow: fl,
  };
}
