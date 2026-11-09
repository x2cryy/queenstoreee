import { cache } from "react";
import { createClient } from "../supabase/server";
import { getMyPermissions } from "./access";
import { fetchAll } from "./dashboard";

export type Section<T> = { state: "ok" | "error"; rows: T[] } | null;
export type OrderRow = { id: string | number; order_number: string | number | null; customer_name: string; total: number; status: string; created_at: string };
export type ProductRow = { id: string | number; name: string; status: string; created_at: string; updated_at: string };
export type LogRow = { id: string | number; action: string; entity_type: string | null; created_at: string; actor: string | null };
export type StockRow = { id: string | number; name: string; quantity: number; out: boolean };
export type Activity = {
  orders: Section<OrderRow>;
  products: Section<ProductRow>;
  logs: Section<LogRow>;
  stock: Section<StockRow>;
};

async function section<T>(run: () => Promise<T[]>): Promise<Section<T>> {
  try {
    return { state: "ok", rows: await run() };
  } catch {
    return { state: "error", rows: [] };
  }
}

export const getRecentActivity = cache(async (): Promise<Activity> => {
  const perms = await getMyPermissions();
  const has = (k: (typeof perms)[number]) => perms.includes(k);
  const supabase = await createClient();

  const [orders, products, logs, stock] = await Promise.all([
    has("orders")
      ? section<OrderRow>(async () => {
          const { data, error } = await supabase
            .from("orders")
            .select("id, order_number, customer_name, total, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5);
          if (error) throw error;
          return (data ?? []) as OrderRow[];
        })
      : null,
    has("products")
      ? section<ProductRow>(async () => {
          const { data, error } = await supabase
            .from("products")
            .select("id, name, status, created_at, updated_at")
            .order("updated_at", { ascending: false })
            .limit(5);
          if (error) throw error;
          return (data ?? []) as ProductRow[];
        })
      : null,
    has("activity_logs")
      ? section<LogRow>(async () => {
          const { data, error } = await supabase
            .from("activity_logs")
            .select("id, actor_id, action, entity_type, created_at")
            .order("created_at", { ascending: false })
            .limit(6);
          if (error) throw error;
          const rows = data ?? [];
          const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))];
          const names = new Map<string, string>();
          if (ids.length) {
            const res = await supabase.from("profiles").select("id, full_name").in("id", ids);
            for (const p of res.data ?? []) if (p.full_name) names.set(p.id, p.full_name);
          }
          return rows.map((r) => ({
            id: r.id,
            action: r.action,
            entity_type: r.entity_type ?? null,
            created_at: r.created_at,
            actor: r.actor_id ? names.get(r.actor_id) ?? null : null,
          }));
        })
      : null,
    has("inventory") || has("products")
      ? section<StockRow>(async () => {
          const rows = await fetchAll<{ id: string | number; name: string; quantity: number; low_stock_threshold: number; status: string }>(
            (f, t) =>
              supabase
                .from("products")
                .select("id, name, quantity, low_stock_threshold, status")
                .neq("status", "hidden")
                .order("id")
                .range(f, t)
          );
          return rows
            .map((r) => {
              const q = Number(r.quantity) || 0;
              return { id: r.id, name: r.name, quantity: q, out: r.status === "sold_out" || q === 0, thr: Number(r.low_stock_threshold) || 0 };
            })
            .filter((r) => r.out || (r.quantity > 0 && r.quantity <= r.thr))
            .sort((a, b) => a.quantity - b.quantity)
            .slice(0, 6)
            .map(({ id, name, quantity, out }) => ({ id, name, quantity, out }));
        })
      : null,
  ]);

  return { orders, products, logs, stock };
});
