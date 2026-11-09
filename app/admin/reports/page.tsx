import "./reports.css";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import ReportsClient from "./_components/ReportsClient";
import { toReport } from "./_lib/report";
import { resolvePeriod, todayISO, type RangeKey, type TabKey } from "./_lib/utils";

export const dynamic = "force-dynamic";

type SP = { t?: string; r?: string; from?: string; to?: string };
const TAB_KEYS: string[] = ["summary", "sales", "profit"];
const RANGE_KEYS: string[] = ["today", "7", "30", "month", "custom"];

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["reports"]);
  const sp = await searchParams;
  const today = todayISO();
  const tab = (TAB_KEYS.includes(sp.t ?? "") ? sp.t : "summary") as TabKey;
  const key = (RANGE_KEYS.includes(sp.r ?? "") ? sp.r : "30") as RangeKey;
  const period = resolvePeriod(key, today, sp.from, sp.to);
  const sb = await createClient();
  const { data, error } = await sb.rpc("rpt7_summary", { p_from: period.from, p_to: period.to });
  const report = error || !data ? null : toReport(data, period);
  return (
    <ReportsClient
      key={`${period.from}_${period.to}`}
      today={today}
      initialTab={tab}
      period={period}
      report={report}
    />
  );
}
