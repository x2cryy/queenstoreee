import { createClient } from "../supabase/server";
import { getRole } from "../auth/session";
import { getMyPermissions } from "./access";
import { PAYMENT_STATUS_LABEL, statusLabel } from "../shop/orders";
import type { OrderDrawerData } from "../../app/admin/orders/_components/OrderDrawer";

const ID = /^[0-9a-f-]{36}$/i;

type Hist = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

export async function fetchOrderDrawer(openId: string): Promise<OrderDrawerData | null> {
  if (!ID.test(openId)) return null;
  const supabase = await createClient();
  const [od, oi, op, oh] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,order_number,customer_id,customer_name,phone,governorate,area,address,landmark,notes,delivery_notes,coupon_code,subtotal,discount_total,delivery_fee,total,payment_method,payment_status,status,created_at,delivered_at,cancel_reason,return_reason",
      )
      .eq("id", openId)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select("id,product_name,variant_label,sku,unit_price,quantity,line_total")
      .eq("order_id", openId),
    supabase
      .from("payments")
      .select("id,payment_number,method,amount,status,created_at")
      .eq("order_id", openId)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_status_history")
      .select("id,from_status,to_status,note,created_at")
      .eq("order_id", openId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!od.data) return null;

  const [dbt, rm, role, perms, nt] = await Promise.all([
    supabase
      .from("store_debts")
      .select("id,original_amount,paid_amount,status,due_date")
      .eq("order_id", openId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    supabase.rpc("fin_order_room", { p_order: openId }),
    getRole(),
    getMyPermissions(),
    supabase
      .from("order_notes")
      .select("id,body,created_at")
      .eq("order_id", openId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const debtRows = (dbt.data ?? []) as {
    id: string;
    original_amount: number;
    paid_amount: number;
    status: string;
    due_date: string | null;
  }[];
  const debt = debtRows.length
    ? {
        id: debtRows[0].id,
        original_amount: debtRows.reduce((n, d) => n + (Number(d.original_amount) || 0), 0),
        paid_amount: debtRows.reduce((n, d) => n + (Number(d.paid_amount) || 0), 0),
        status: debtRows[0].status,
        due_date: debtRows[0].due_date,
      }
    : null;
  const room = Math.max(0, Number(rm.data) || 0);
  const canDebt = role === "owner" || perms.includes("store_debts");
  const ro = od.data as unknown as OrderDrawerData["order"];
  return {
    order: {
      ...ro,
      status_label: statusLabel(ro.status),
      pay_label: PAYMENT_STATUS_LABEL[ro.payment_status] ?? ro.payment_status,
    },
    items: (oi.data ?? []) as unknown as OrderDrawerData["items"],
    debt,
    room,
    canDebt,
    notes: (nt.data ?? []) as OrderDrawerData["notes"],
    payments: (op.data ?? []) as unknown as OrderDrawerData["payments"],
    history: ((oh.data ?? []) as unknown as Hist[]).map((h) => ({
      id: h.id,
      note: h.note,
      created_at: h.created_at,
      from_label: h.from_status ? statusLabel(h.from_status) : null,
      to_label: statusLabel(h.to_status),
    })),
  };
}
