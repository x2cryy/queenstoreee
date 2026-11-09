import { cache } from "react";
import { createClient } from "../supabase/server";
import { getMyPermissions } from "./access";
import { formatCount, formatMoney } from "./format";

export type Card = {
  id: string;
  label: string;
  icon: string;
  href?: string;
  state: "ok" | "error" | "na";
  value?: string;
  hint?: string;
  tone?: "warn";
};

type Ok = { value: string; hint?: string; tone?: "warn" };
type Meta = { id: string; label: string; icon: string; href?: string };

const TZ = "Asia/Baghdad";
const baghdadDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

// PostgREST returns at most 1000 rows per request, so read page by page.
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

async function countOf(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const getDashboardCards = cache(async (): Promise<Card[]> => {
  const perms = await getMyPermissions();
  const has = (k: (typeof perms)[number]) => perms.includes(k);
  const supabase = await createClient();
  const today = baghdadDate();

  const pending: Promise<Card>[] = [];
  const add = (meta: Meta, fn: () => Promise<Ok>) => {
    pending.push(
      fn().then(
        (r): Card => ({ ...meta, state: "ok", ...r }),
        (): Card => ({ ...meta, state: "error" })
      )
    );
  };

  // ---- Orders ----
  if (has("orders")) {
    const orderRows = fetchAll<{ total: number; created_at: string }>((f, t) =>
      supabase.from("orders").select("total, created_at").neq("status", "cancelled").order("id").range(f, t)
    );
    const countStatus = (s: string[]) =>
      countOf(supabase.from("orders").select("id", { count: "exact", head: true }).in("status", s));

    add({ id: "sales_total", label: "إجمالي المبيعات", icon: "banknote", href: "/admin/orders" }, async () => {
      const rows = await orderRows;
      return { value: formatMoney(rows.reduce((s, r) => s + num(r.total), 0)), hint: "الطلبات غير الملغاة" };
    });
    add({ id: "sales_today", label: "مبيعات اليوم", icon: "calendar", href: "/admin/orders" }, async () => {
      const rows = await orderRows;
      const sum = rows
        .filter((r) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(r.created_at)) === today)
        .reduce((s, r) => s + num(r.total), 0);
      return { value: formatMoney(sum), hint: "بتوقيت بغداد" };
    });
    add({ id: "orders_new", label: "طلبات جديدة", icon: "bag", href: "/admin/orders" }, async () => ({
      value: formatCount(await countStatus(["new"])),
    }));
    add({ id: "orders_processing", label: "طلبات قيد المعالجة", icon: "hourglass", href: "/admin/orders" }, async () => ({
      value: formatCount(await countStatus(["preparing", "ready"])),
      hint: "قيد التحضير أو جاهزة",
    }));
    add({ id: "orders_done", label: "طلبات مكتملة", icon: "check", href: "/admin/orders" }, async () => ({
      value: formatCount(await countStatus(["delivered"])),
      hint: "تم تسليمها",
    }));
  }

  // ---- Customers ----
  if (has("customers")) {
    add({ id: "customers", label: "الزبائن", icon: "users", href: "/admin/customers" }, async () => ({
      value: formatCount(await countOf(supabase.from("customers").select("id", { count: "exact", head: true }))),
    }));
  }

  // ---- Products / stock ----
  if (has("products") || has("inventory")) {
    const productRows = fetchAll<{ status: string; quantity: number; low_stock_threshold: number }>((f, t) =>
      supabase.from("products").select("status, quantity, low_stock_threshold").order("id").range(f, t)
    );
    const href = has("products") ? "/admin/products" : "/admin/inventory";
    add({ id: "products_active", label: "منتجات نشطة", icon: "package", href }, async () => ({
      value: formatCount((await productRows).filter((p) => p.status === "active").length),
    }));
    add({ id: "products_low", label: "منتجات منخفضة المخزون", icon: "alert", href: has("inventory") ? "/admin/inventory" : href }, async () => {
      const n = (await productRows).filter(
        (p) => p.status === "active" && num(p.quantity) > 0 && num(p.quantity) <= num(p.low_stock_threshold)
      ).length;
      return { value: formatCount(n), tone: n > 0 ? "warn" : undefined };
    });
    add({ id: "products_out", label: "منتجات نافدة", icon: "packagex", href: has("inventory") ? "/admin/inventory" : href }, async () => {
      const n = (await productRows).filter(
        (p) => p.status !== "hidden" && (p.status === "sold_out" || num(p.quantity) === 0)
      ).length;
      return { value: formatCount(n), tone: n > 0 ? "warn" : undefined };
    });
  }

  // ---- Store debts ----
  if (has("store_debts")) {
    const debtRows = fetchAll<{ direction: string; remaining_amount: number }>((f, t) =>
      supabase
        .from("store_debts")
        .select("direction, remaining_amount")
        .in("status", ["open", "partial"])
        .order("id")
        .range(f, t)
    );
    const sumDir = async (dir: string) =>
      (await debtRows).filter((d) => d.direction === dir).reduce((s, d) => s + num(d.remaining_amount), 0);
    add({ id: "debt_receivable", label: "ديون مستحقة للمتجر", icon: "wallet", href: "/admin/debts" }, async () => ({
      value: formatMoney(await sumDir("receivable")),
      hint: "المتبقي من الديون المفتوحة",
    }));
    add({ id: "debt_payable", label: "ديون على المتجر", icon: "wallet", href: "/admin/debts" }, async () => ({
      value: formatMoney(await sumDir("payable")),
      hint: "المتبقي من الديون المفتوحة",
    }));
  }

  // ---- Overdue installments ----
  if (has("installments")) {
    add({ id: "inst_overdue", label: "أقساط متأخرة", icon: "clock", href: "/admin/debts" }, async () => {
      const rows = await fetchAll<{ amount_due: number; amount_paid: number }>((f, t) =>
        supabase
          .from("installment_schedule")
          .select("amount_due, amount_paid, installments!inner(status)")
          .eq("installments.status", "active")
          .lt("due_date", today)
          .order("id")
          .range(f, t)
      );
      const late = rows.filter((r) => num(r.amount_paid) < num(r.amount_due));
      const remaining = late.reduce((s, r) => s + (num(r.amount_due) - num(r.amount_paid)), 0);
      return {
        value: formatCount(late.length),
        hint: late.length ? "بقيمة " + formatMoney(remaining) : undefined,
        tone: late.length ? "warn" : undefined,
      };
    });
  }

  // ---- Net profit: no expenses table exists, so it cannot be computed correctly ----
  const results = await Promise.all(pending);
  if (has("costs")) {
    results.push({
      id: "net_profit",
      label: "صافي الربح",
      icon: "trend",
      state: "na",
      hint: "غير متاح: لا توجد بيانات مصاريف في النظام بعد، ولا يُحسب بدونها.",
    });
  }
  return results;
});
