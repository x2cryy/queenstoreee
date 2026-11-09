import Link from "next/link";
import { Phone, Search } from "lucide-react";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { fmtIQD, fmtNum, fmtDate } from "../../../lib/admin/fmt";
import { PageHead, KpiGrid, Panel, Empty, Badge } from "../_components/ui";

const PAGE_SIZE = 25;

const FILTERS: Record<string, string> = {
  all: "كل العملاء",
  buyers: "لديهم طلبات",
  active: "طلبوا خلال الفترة",
  none: "بدون طلبات",
  account: "لديهم حساب",
  guest: "بدون حساب",
  debts: "عليهم دين",
  inst: "عليهم أقساط",
  overdue: "عليهم مستحقات متأخرة",
};
const SORTS: Record<string, string> = {
  recent: "آخر تعامل",
  name: "الاسم",
  orders: "عدد الطلبات",
  spent: "قيمة المشتريات",
  debt: "المتبقي",
};
const PERIODS: Record<string, string> = {
  "7": "آخر 7 أيام",
  "30": "آخر 30 يومًا",
  "90": "آخر 90 يومًا",
  "365": "آخر سنة",
  "0": "كل الفترات",
};

type Row = {
  id: string;
  full_name: string | null;
  phone: string | null;
  area: string | null;
  created_at: string;
  has_account: boolean;
  orders_count: number;
  last_order_at: string | null;
  purchases_total: number;
  debt_left: number;
  inst_left: number;
  debt_overdue: boolean;
  inst_overdue: boolean;
};
type Payload = {
  total: number;
  rows: Row[];
  kpis: { total: number; buyers_in_period: number; owing: number; overdue: number };
};
type SP = { q?: string; f?: string; s?: string; p?: string; pg?: string };
type Query = { q: string; f: string; s: string; p: string };

const pick = (v: string | undefined, map: Record<string, string>, d: string) =>
  v && Object.keys(map).includes(v) ? v : d;

function hrefFor(x: Query, pg: number) {
  const u = new URLSearchParams();
  if (x.q) u.set("q", x.q);
  if (x.f !== "all") u.set("f", x.f);
  if (x.s !== "recent") u.set("s", x.s);
  if (x.p !== "30") u.set("p", x.p);
  if (pg > 1) u.set("pg", String(pg));
  const qs = u.toString();
  return qs ? `/admin/customers?${qs}` : "/admin/customers";
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["customers"]);
  const sp = await searchParams;
  const x: Query = {
    q: (sp.q ?? "").trim().slice(0, 80),
    f: pick(sp.f, FILTERS, "all"),
    s: pick(sp.s, SORTS, "recent"),
    p: pick(sp.p, PERIODS, "30"),
  };
  const pg = Math.min(Math.max(Number.parseInt(sp.pg ?? "1", 10) || 1, 1), 100000);
  const offset = (pg - 1) * PAGE_SIZE;

  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_customers_list", {
    p_q: x.q || null,
    p_filter: x.f,
    p_sort: x.s,
    p_period_days: Number(x.p),
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error || !data) {
    return (
      <section>
        <PageHead title="العملاء" desc="طلبات عملائك وحساباتهم وسجل تعاملهم في مكان واحد" />
        <Panel>
          <Empty>تعذر تحميل قائمة العملاء. هذا لا يعني عدم وجود عملاء.</Empty>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <Link className="ds-btn" href={hrefFor(x, pg)}>إعادة المحاولة</Link>
            {error?.code ? <small className="qa-muted" dir="ltr">{error.code}</small> : null}
          </span>
        </Panel>
      </section>
    );
  }

  const payload = data as Payload;
  const rows = payload.rows ?? [];
  const total = Number(payload.total ?? 0);
  const k = payload.kpis;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const hasFilters = x.q !== "" || x.f !== "all";

  return (
    <section>
      <PageHead title="العملاء" desc="طلبات عملائك وحساباتهم وسجل تعاملهم في مكان واحد" />
      <KpiGrid
        items={[
          { label: "إجمالي العملاء", value: fmtNum(k.total) },
          { label: "طلبوا خلال الفترة", value: fmtNum(k.buyers_in_period), hint: PERIODS[x.p] },
          { label: "عليهم مبلغ للمتجر", value: fmtNum(k.owing), hint: "دين أو قسط قائم" },
          { label: "عليهم مستحقات متأخرة", value: fmtNum(k.overdue), hint: "تجاوز تاريخ الاستحقاق" },
        ]}
      />
      <Panel title="قائمة العملاء">
        <form method="get" className="ds-filters">
          <input
            className="ds-input"
            style={{ flex: "1 1 220px" }}
            name="q"
            defaultValue={x.q}
            placeholder="الاسم أو الهاتف أو رقم الطلب"
            aria-label="بحث"
          />
          <select className="ds-input" name="f" defaultValue={x.f} aria-label="تصفية">
            {Object.entries(FILTERS).map(([key, v]) => (
              <option key={key} value={key}>{v}</option>
            ))}
          </select>
          <select className="ds-input" name="s" defaultValue={x.s} aria-label="ترتيب">
            {Object.entries(SORTS).map(([key, v]) => (
              <option key={key} value={key}>{v}</option>
            ))}
          </select>
          <select className="ds-input" name="p" defaultValue={x.p} aria-label="الفترة">
            {Object.entries(PERIODS).map(([key, v]) => (
              <option key={key} value={key}>{v}</option>
            ))}
          </select>
          <button className="ds-btn ds-btn-gold" type="submit"><Search size={16} /> تطبيق</button>
          {hasFilters ? <Link className="ds-btn" href="/admin/customers">مسح الفلاتر</Link> : null}
        </form>

        <p className="ds-desc">
          {fmtNum(total)} نتيجة
          {x.q ? ` للبحث «${x.q}»` : ""}
          {x.f !== "all" ? ` · ${FILTERS[x.f]}` : ""}
        </p>

        {total === 0 ? (
          <Empty>{hasFilters ? "لا توجد نتائج مطابقة." : "لا يوجد عملاء بعد."}</Empty>
        ) : rows.length === 0 ? (
          <Empty>
            هذه الصفحة خارج النطاق. <Link href={hrefFor(x, 1)}>العودة إلى الصفحة الأولى</Link>
          </Empty>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>المنطقة</th>
                <th>الطلبات</th>
                <th>آخر طلب</th>
                <th>المشتريات</th>
                <th>المتبقي للمتجر</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="العميل">
                    <strong>{r.full_name ?? "بدون اسم"}</strong>
                    <br />
                    <small className="qa-muted">{r.has_account ? "حساب" : "بدون حساب"}</small>
                  </td>
                  <td data-label="الهاتف"><span dir="ltr">{r.phone ?? "-"}</span></td>
                  <td data-label="المنطقة">{r.area ?? "-"}</td>
                  <td data-label="الطلبات">{fmtNum(r.orders_count)}</td>
                  <td data-label="آخر طلب">{r.last_order_at ? fmtDate(r.last_order_at) : "-"}</td>
                  <td data-label="المشتريات">{fmtIQD(r.purchases_total)}</td>
                  <td data-label="المتبقي للمتجر">
                    {r.debt_left > 0 || r.inst_left > 0 ? (
                      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                        {r.debt_left > 0 ? <Badge>دين {fmtIQD(r.debt_left)}</Badge> : null}
                        {r.inst_left > 0 ? <Badge>قسط {fmtIQD(r.inst_left)}</Badge> : null}
                        {r.debt_overdue || r.inst_overdue ? <Badge>متأخر</Badge> : null}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      {r.phone ? (
                        <a className="ds-btn" href={`tel:${r.phone}`} aria-label="اتصال"><Phone size={16} /></a>
                      ) : null}
                      <Link className="ds-btn" href={`/admin/customers/${r.id}`}>فتح الملف</Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginTop: 12 }}>
            <span className="ds-desc">{fmtNum(from)} إلى {fmtNum(to)} من {fmtNum(total)}</span>
            <span style={{ display: "inline-flex", gap: 8 }}>
              {pg > 1 ? <Link className="ds-btn" href={hrefFor(x, pg - 1)}>السابق</Link> : null}
              {pg < pages ? <Link className="ds-btn" href={hrefFor(x, pg + 1)}>التالي</Link> : null}
            </span>
          </div>
        ) : null}

        <p className="ds-desc">
          عدد الطلبات يشمل غير الملغاة. المشتريات: إجمالي الطلبات المسلّمة فقط دون الملغاة أو المرتجعة.
          الدين والقسط يُعرضان منفصلين دون جمعهما. المتبقي للمتجر يشمل ما على العميل فقط.
        </p>
      </Panel>
    </section>
  );
}
