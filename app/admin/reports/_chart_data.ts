import { fmtVal } from "./_components/Generic";

export type Day = { date: string; revenue: number; collected: number; orders: number };
export type Bar = { name: string; value: number; text: string };

export function toDays(data: unknown): Day[] {
  if (!Array.isArray(data)) return [];
  return data.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      date: String(o.sales_day ?? ""),
      revenue: Number(o.revenue ?? 0),
      collected: Number(o.collected ?? 0),
      orders: Number(o.orders_count ?? 0),
    };
  });
}

const NAME_KEYS = ["name", "full_name", "product_name", "party_name", "title", "label"];
const VAL_KEYS = ["revenue", "total", "total_spent", "spent", "sold", "quantity", "qty", "amount", "orders", "count"];

export type AutoChart = { title: string; metric: string; items: Bar[] };

// يبحث داخل بيانات RPC عن قوائم فيها اسم + رقم، ويحوّلها لأعمدة أفقية
export function autoBars(data: unknown, maxRows = 8): AutoChart[] {
  const out: AutoChart[] = [];
  const walk = (key: string, v: unknown, depth: number) => {
    if (depth > 2 || !v || typeof v !== "object") return;
    if (Array.isArray(v)) {
      const rows = v.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
      if (!rows.length) return;
      const nk = NAME_KEYS.find((k) => k in rows[0]);
      const vk = VAL_KEYS.find((k) => k in rows[0] && !Number.isNaN(Number(rows[0][k])));
      if (!nk || !vk) return;
      const items = rows
        .slice(0, maxRows)
        .map((r) => ({ name: String(r[nk] ?? "-"), value: Number(r[vk] ?? 0), text: fmtVal(vk, Number(r[vk] ?? 0)) }))
        .filter((i) => i.value > 0);
      if (items.length) out.push({ title: key || "top", metric: vk, items });
      return;
    }
    for (const [k, x] of Object.entries(v as object)) walk(k, x, depth + 1);
  };
  walk("", data, 0);
  return out;
}
