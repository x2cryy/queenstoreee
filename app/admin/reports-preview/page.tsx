import "./preview.css";
import { requireAnyPermission } from "../../../lib/admin/access";
import PreviewClient from "./_components/PreviewClient";
import { resolvePeriod, todayISO, type RangeKey, type TabKey } from "./_lib/utils";

type SP = { t?: string; r?: string; from?: string; to?: string };

const TAB_KEYS: string[] = ["summary", "sales", "debts"];
const RANGE_KEYS: string[] = ["today", "7", "30", "month", "custom"];

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["reports"]);
  const sp = await searchParams;
  const today = todayISO();
  const tab = (TAB_KEYS.includes(sp.t ?? "") ? sp.t : "summary") as TabKey;
  const key = (RANGE_KEYS.includes(sp.r ?? "") ? sp.r : "30") as RangeKey;
  const period = resolvePeriod(key, today, sp.from, sp.to);
  return <PreviewClient today={today} initialTab={tab} initialPeriod={period} />;
}
