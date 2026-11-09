"use server";

import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  total: number;
  created_at: string;
  status: string;
};
export type OrdersPage = { ok: true; total: number; rows: OrderRow[] } | { ok: false };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const GROUPS = ["done", "processing", "cancelled", "returned"];

export async function loadOrders(input: { from: string; to: string; group: string; offset: number }): Promise<OrdersPage> {
  await requireAnyPermission(["reports"]);
  const from = String(input.from ?? "");
  const to = String(input.to ?? "");
  const group = String(input.group ?? "");
  const offset = Number.isInteger(input.offset) && input.offset >= 0 && input.offset <= 100000 ? input.offset : 0;
  if (!ISO.test(from) || !ISO.test(to) || !GROUPS.includes(group)) return { ok: false };
  const sb = await createClient();
  const { data, error } = await sb.rpc("rpt7_orders_by_group", {
    p_from: from,
    p_to: to,
    p_group: group,
    p_limit: 20,
    p_offset: offset,
  });
  if (error || !data) return { ok: false };
  const d = data as { total?: unknown; rows?: unknown };
  const rows: OrderRow[] = Array.isArray(d.rows)
    ? (d.rows as OrderRow[]).map((o) => ({
        id: String(o.id),
        order_number: String(o.order_number ?? ""),
        customer_name: o.customer_name ? String(o.customer_name) : null,
        total: Number(o.total) || 0,
        created_at: String(o.created_at ?? ""),
        status: String(o.status ?? ""),
      }))
    : [];
  return { ok: true, total: Number(d.total) || 0, rows };
}
