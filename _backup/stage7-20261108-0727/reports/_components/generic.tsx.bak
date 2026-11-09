import { fmtIQD, fmtNum } from "../../../../lib/admin/fmt";
import { KpiGrid, Panel, Empty, type Kpi } from "../../_components/ui";

const L: Record<string, string> = {
  open: "الديون المفتوحة", count_open: "عدد الديون المفتوحة",
  revenue: "الإيراد", collected: "المحصّل", orders: "الطلبات", orders_count: "عدد الطلبات",
  sales_day: "التاريخ", count: "العدد", status: "الحالة", method: "طريقة الدفع",
  governorate: "المحافظة", hour: "الساعة", name: "الاسم", quantity: "الكمية",
  sold: "المباع", unsold: "غير المباع", top: "الأفضل", inactive: "غير النشطين",
  new_customers: "زبائن جدد", by_status: "حسب الحالة", by_payment_method: "حسب طريقة الدفع",
  by_governorate: "حسب المحافظة", by_hour: "حسب الساعة", collected_in_period: "المحصّل خلال الفترة",
  collection_pct: "نسبة التحصيل", due_total: "إجمالي المستحق", installments: "الأقساط",
  overdue: "المتأخر", overdue_count: "عدد المتأخر", paid_total: "إجمالي المدفوع",
  payable_remaining: "المتبقي علينا", receivable_original: "أصل الديون لنا",
  receivable_overdue: "المتأخر لنا", receivable_paid: "المدفوع لنا",
  receivable_remaining: "المتبقي لنا", store_debts: "ديون المتجر", active: "منتجات نشطة",
  low_stock: "مخزون منخفض", out_of_stock: "نافدة", stock_value: "قيمة المخزون",
  products_without_cost: "منتجات بدون تكلفة", threshold: "حد التنبيه", current: "الفترة الحالية",
  previous: "الفترة السابقة", total: "الإجمالي", profit: "الربح", cost: "التكلفة",
  customers: "الزبائن", phone: "الهاتف", full_name: "الاسم",
};
export const label = (k: string) => L[k] ?? k.replace(/_/g, " ");

const SKIP = new Set(["id", "costs_visible", "from", "to", "prev_from", "prev_to"]);
const PCT = /pct|percent/;
const CNT = /count|orders|qty|quantity|sold|unsold|threshold|hour|active|low_stock|out_of_stock|without_cost|inactive|new_customers/;
const MONEY = /revenue|total|collected|paid|remaining|value|amount|profit|cost|original|due|price|overdue|balance/;

export function fmtVal(k: string, v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") {
    if (PCT.test(k)) return `${fmtNum(Math.round(v * 10) / 10)}%`;
    if (CNT.test(k)) return fmtNum(v);
    return MONEY.test(k) ? fmtIQD(v) : fmtNum(v);
  }
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v;
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return "-";
}

export function kpisFromObject(o: Record<string, unknown>, prev?: Record<string, unknown>): Kpi[] {
  const out: Kpi[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (SKIP.has(k) || (typeof v !== "number" && typeof v !== "string")) continue;
    out.push({
      label: label(k),
      value: fmtVal(k, v),
      hint: prev && prev[k] !== undefined ? `السابقة: ${fmtVal(k, prev[k])}` : undefined,
    });
  }
  return out;
}

export function RowsTable({ rows }: { rows: unknown[] }) {
  if (rows.length === 0) return <Empty>لا توجد بيانات في هذه الفترة.</Empty>;
  const first = rows[0];
  if (first === null || typeof first !== "object") {
    return <Empty>{rows.map(String).join("، ")}</Empty>;
  }
  const cols = Object.keys(first as object).filter((k) => !SKIP.has(k));
  const shown = rows.slice(0, 50) as Record<string, unknown>[];
  return (
    <>
      <table className="ds-table">
        <thead><tr>{cols.map((c) => <th key={c}>{label(c)}</th>)}</tr></thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => <td key={c} data-label={label(c)}>{fmtVal(c, r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 ? <p className="ds-desc">يعرض أول 50 صفاً من {fmtNum(rows.length)}.</p> : null}
    </>
  );
}

export function DataView({ data }: { data: unknown }) {
  if (Array.isArray(data)) return <Panel><RowsTable rows={data} /></Panel>;
  if (!data || typeof data !== "object") return <Empty>لا توجد بيانات.</Empty>;
  const o = data as Record<string, unknown>;
  const kpis = kpisFromObject(o);
  const nested = Object.entries(o).filter(([k, v]) => !SKIP.has(k) && v !== null && typeof v === "object");
  return (
    <>
      {kpis.length ? <KpiGrid items={kpis} /> : null}
      {nested.map(([k, v]) => (
        <Panel key={k} title={label(k)}>
          {Array.isArray(v) ? <RowsTable rows={v} /> : <DataView data={v} />}
        </Panel>
      ))}
    </>
  );
}
