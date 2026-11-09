import Link from "next/link";
import { getMyPermissions, requireAnyPermission } from "../../../lib/admin/access";
import { getRole } from "../../../lib/auth/session";
import { fmtIQD, fmtNum } from "../../../lib/admin/fmt";
import { createClient } from "../../../lib/supabase/server";
import { PageHead, KpiGrid, Panel, Empty, type Kpi } from "../_components/ui";
import { DataView, RowsTable, kpisFromObject, label } from "./_components/Generic";
import { DailyChart, HBars, Fade } from "./_components/ReportCharts";
import { autoBars, toDays } from "./_chart_data";

type SP = { t?: string; r?: string; from?: string; to?: string };
const ALL_TABS: [string, string][] = [
  ["overview", "نظرة عامة"], ["sales", "المبيعات"], ["products", "المنتجات"],
  ["customers", "الزبائن"], ["debts", "الديون"], ["inventory", "المخزون"], ["installments", "الأقساط"], ["personal_debts", "الديون الشخصية"], ["profit", "صافي الربح"],
];
const RANGES: [string, string][] = [["today", "اليوم"], ["7", "7 أيام"], ["30", "30 يوماً"]];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["reports"]);
  const sp = await searchParams;
  const myPerms = (await getMyPermissions()) as string[];
  const canCosts = (await getRole()) === "owner" || myPerms.includes("costs");
  const TABS = ALL_TABS.filter(([k]) => k !== "profit" || canCosts);
  const tab = TABS.some(([k]) => k === sp.t) ? (sp.t as string) : "overview";
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  let r = sp.r ?? "30";
  let from = addDays(today, -29);
  let to = today;
  if (r === "today") from = today;
  else if (r === "7") from = addDays(today, -6);
  else if (r === "custom" && sp.from && sp.to && ISO.test(sp.from) && ISO.test(sp.to) && sp.from <= sp.to) {
    from = sp.from; to = sp.to;
  } else r = "30";

  const sb = await createClient();
  const args = { p_from: from, p_to: to };
  const call = async () => {
    switch (tab) {
      case "overview": return [await sb.rpc("rpt_overview", args), await sb.rpc("rpt_sales_daily", args)];
      case "sales": return [await sb.rpc("rpt_sales_daily", args), await sb.rpc("rpt_breakdown", args)];
      case "products": return [await sb.rpc("rpt_products", args)];
      case "customers": return [await sb.rpc("rpt_customers", { ...args, p_inactive_days: 30 })];
      case "debts": return [await sb.rpc("rpt_debts", args)];
      case "installments": return [await sb.rpc("rpt_debts", args)];
      case "personal_debts": return [await sb.rpc("rpt_personal_debts")];
      case "profit": return [await sb.rpc("rpt_overview", args)];
      default: return [await sb.rpc("rpt_inventory")];
    }
  };
  const res = await call();
  const failed = res.find((x) => x.error);

  const link = (over: Partial<SP>) => {
    const p = new URLSearchParams({ t: tab, r, ...(r === "custom" ? { from, to } : {}), ...over } as Record<string, string>);
    return `/admin/reports?${p.toString()}`;
  };
  const usesRange = tab !== "inventory" && tab !== "personal_debts";

  // RPT_DEBUG
  if (process.env.NODE_ENV !== "production") console.log("RPT_DEBUG", tab, JSON.stringify(res.map((x) => x.data)).slice(0, 1500));
  let body: React.ReactNode;
  if (failed) {
    body = <Panel><Empty>تعذّر تحميل التقرير. تحقق من صلاحية التقارير وحاول مجدداً.</Empty></Panel>;
  } else if (tab === "overview") {
    const d = (res[0].data ?? {}) as Record<string, unknown>;
    const cur = (d.current ?? {}) as Record<string, unknown>;
    const prev = (d.previous ?? {}) as Record<string, unknown>;
    const items = kpisFromObject(cur, prev);
    body = items.length ? <KpiGrid items={items} /> : <Panel><Empty>لا توجد بيانات في هذه الفترة.</Empty></Panel>;
  } else if (tab === "installments") {
      const dd = (res[0].data ?? {}) as Record<string, unknown>;
      body = <DataView data={dd.installments} />;
    } else if (tab === "profit") {
      const pd = (res[0].data ?? {}) as Record<string, unknown>;
      const pick = (o: unknown) => {
        const src = (o ?? {}) as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const k of ["revenue", "cost", "profit"]) if (src[k] !== undefined) out[k] = src[k];
        return out;
      };
      const pitems = kpisFromObject(pick(pd.current), pick(pd.previous));
      body = pitems.length ? <KpiGrid items={pitems} /> : <Panel><Empty>لا توجد بيانات أرباح في هذه الفترة.</Empty></Panel>;
    } else if (tab === "sales") {
    const daily = Array.isArray(res[0].data) ? (res[0].data as unknown[]) : [];
    body = (
      <>
        <Panel title="المبيعات اليومية"><RowsTable rows={daily} /></Panel>
        <DataView data={res[1].data} />
      </>
    );
  } else {
    body = <DataView data={res[0].data} />;
  }

  if (!failed) {
    const dataOf = (i: number): unknown => res[i]?.data;
    const asObj = (v: unknown) => (v ?? {}) as Record<string, unknown>;

    if (tab === "overview") {
      const d = asObj(dataOf(0));
      const cur = { ...asObj(d.current) };
      const prev = { ...asObj(d.previous) };
      delete cur.profit_note;
      delete cur.profit_complete;
      delete prev.profit_note;
      delete prev.profit_complete;
      const items = kpisFromObject(cur, prev);
      body = (
        <>
          {items.length ? <KpiGrid items={items} /> : <Panel><Empty>لا توجد بيانات في هذه الفترة.</Empty></Panel>}
          <Panel title="المبيعات والتحصيل اليومي"><DailyChart days={toDays(dataOf(1))} /></Panel>
        </>
      );
    } else if (tab === "sales") {
      const daily = toDays(dataOf(0));
      const revenue = daily.reduce((a, x) => a + x.revenue, 0);
      const orders = daily.reduce((a, x) => a + x.orders, 0);
      const collected = daily.reduce((a, x) => a + x.collected, 0);
      const kp: Kpi[] = [
        { label: "المبيعات (طلبات مسلّمة)", value: fmtIQD(revenue) },
        { label: "الطلبات المسلّمة", value: fmtNum(orders) },
        { label: "متوسط الطلب", value: fmtIQD(orders ? Math.round(revenue / orders) : 0) },
        { label: "المحصّل", value: fmtIQD(collected) },
      ];
      const rows = Array.isArray(dataOf(0)) ? (dataOf(0) as unknown[]) : [];
      body = (
        <>
          <KpiGrid items={kp} />
          <Panel title="المبيعات والتحصيل اليومي"><DailyChart days={daily} /></Panel>
          <Panel title="تفصيل الأيام"><RowsTable rows={rows} /></Panel>
          <DataView data={dataOf(1)} />
        </>
      );
    } else if (tab === "products" || tab === "customers") {
      const charts = autoBars(dataOf(0));
      body = (
        <>
          {charts.map((c) => (
            <Panel key={c.title + c.metric} title={label(c.title) + " - " + label(c.metric)}>
              <HBars items={c.items} />
            </Panel>
          ))}
          <DataView data={dataOf(0)} />
        </>
      );
    } else if (tab === "profit") {
      const pd = asObj(dataOf(0));
      const cur = asObj(pd.current);
      const prev = asObj(pd.previous);
      const num = (o: Record<string, unknown>, k: string) =>
        o[k] === null || o[k] === undefined ? null : Number(o[k]);
      const money = (k: string) => (num(cur, k) === null ? "-" : fmtIQD(num(cur, k)));
      const hint = (k: string) =>
        num(prev, k) === null ? undefined : "الفترة السابقة: " + fmtIQD(num(prev, k));
      const gp = num(cur, "gross_profit");
      const margin = num(cur, "margin_pct");
      const pm = num(prev, "margin_pct");
      const missing = Number(cur.items_missing_cost ?? 0);
      const kp: Kpi[] = [
        { label: "الإيرادات (بعد الخصم)", value: money("revenue"), hint: hint("revenue") },
        { label: "تكلفة البضاعة", value: money("cogs"), hint: hint("cogs") },
        { label: "الربح الإجمالي", value: money("gross_profit"), hint: hint("gross_profit"), tone: gp === null ? undefined : gp >= 0 ? "good" : "bad" },
        { label: "هامش الربح", value: margin === null ? "-" : margin + "%", hint: pm === null ? undefined : "الفترة السابقة: " + pm + "%" },
      ];
      body = (
        <>
          <KpiGrid items={kp} />
          {missing > 0 ? (
            <div className="qa-note qa-err">
              {fmtNum(missing) + " عنصر مسلّم بدون تكلفة مسجّلة، فالربح الإجمالي قد يكون أعلى من الحقيقي."}
            </div>
          ) : null}
          {typeof cur.profit_note === "string" ? <p className="ds-desc">{"ملاحظة: " + cur.profit_note}</p> : null}
        </>
      );
    }
  }

  return (
    <section>
      <PageHead title="التقارير" desc={usesRange ? `الفترة: ${from} إلى ${to}` : "الوضع الحالي للمخزون."} />
      <div className="ds-filters">
        {TABS.map(([k, l]) => (
          <Link key={k} className={k === tab ? "ds-btn ds-btn-gold" : "ds-btn"} href={link({ t: k })}>{l}</Link>
        ))}
      </div>
      {usesRange ? (
        <>
          <div className="ds-filters">
            {RANGES.map(([k, l]) => (
              <Link key={k} className={k === r ? "ds-btn ds-btn-gold" : "ds-btn"} href={`/admin/reports?t=${tab}&r=${k}`}>{l}</Link>
            ))}
          </div>
          <form method="get" className="ds-filters">
            <input type="hidden" name="t" value={tab} />
            <input type="hidden" name="r" value="custom" />
            <input className="ds-input" style={{ flex: "1 1 150px" }} type="date" name="from" defaultValue={from} required />
            <input className="ds-input" style={{ flex: "1 1 150px" }} type="date" name="to" defaultValue={to} required />
            <button className="ds-btn" type="submit">عرض الفترة</button>
          </form>
        </>
      ) : null}
      <Fade key={tab + "|" + r + "|" + from + "|" + to}>{body}</Fade>
    </section>
  );
}
