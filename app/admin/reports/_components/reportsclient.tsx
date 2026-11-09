"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Download } from "lucide-react";
import PeriodPicker from "./PeriodPicker";
import SummaryTab, { EmptyState, ErrorState, SummarySkeleton } from "./SummaryTab";
import SalesTab from "./SalesTab";
import ProfitTab from "./ProfitTab";
import OrdersDrawer from "./OrdersDrawer";
import type { Report, StatusKey } from "../_lib/types";
import { TABS, formatDate, previousPeriod, type Period, type TabKey } from "../_lib/utils";

function downloadCsv(report: Report) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: (string | number)[][] = [
    ["تقرير المبيعات والتحصيل"],
    [`الفترة: ${report.period.from} إلى ${report.period.to}`],
    ["المنطقة الزمنية: بغداد (UTC+3)"],
    [],
    ["التاريخ", "صافي المبيعات (د.ع)", "المبالغ المحصلة (د.ع)", "الطلبات المسلّمة"],
    ...report.daily.map((d) => [d.date, d.netSales, d.collected, d.orders]),
    [],
    ["الإجمالي", report.cur.netSales, report.cur.collected, report.cur.ordersDelivered],
  ];
  const csv = "\ufeff" + lines.map((l) => l.map(q).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reports_${report.period.from}_${report.period.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsClient({
  today,
  initialTab,
  period,
  report,
}: {
  today: string;
  initialTab: TabKey;
  period: Period;
  report: Report | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [group, setGroup] = useState<StatusKey | null>(null);
  const prev = previousPeriod(period);

  // نحفظ التبويب والفترة في الرابط بدون إعادة تحميل
  useEffect(() => {
    const p = new URLSearchParams({ t: tab, r: period.key });
    if (period.key === "custom") {
      p.set("from", period.from);
      p.set("to", period.to);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [tab, period]);

  const closeDrawer = useCallback(() => setGroup(null), []);

  const goPeriod = useCallback(
    (p: Period) => {
      const q = new URLSearchParams({ t: tab, r: p.key });
      if (p.key === "custom") {
        q.set("from", p.from);
        q.set("to", p.to);
      }
      startTransition(() => router.push(`/admin/reports?${q.toString()}`));
    },
    [router, tab],
  );

  const empty = !!report && report.cur.ordersTotal === 0 && report.cur.collected === 0 && report.cur.refunded === 0;
  const canExport = !!report && !empty && report.daily.length > 0;
  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  let body: React.ReactNode;
  if (pending) body = <SummarySkeleton />;
  else if (!report) body = <ErrorState onRetry={() => router.refresh()} />;
  else if (empty) body = <EmptyState />;
  else if (tab === "summary") body = <SummaryTab report={report} onOpenStatus={setGroup} />;
  else if (tab === "sales") body = <SalesTab report={report} onOpenStatus={setGroup} />;
  else body = <ProfitTab report={report} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="rp-root" dir="rtl">
        <div className="rp-body">
          <header className="rp-head">
            <div>
              <h1 className="rp-title">التقارير</h1>
              <p className="rp-desc">أداء متجرك خلال الفترة المحددة</p>
              <p className="rp-dates">
                الفترة: {formatDate(period.from)}
                {period.from !== period.to && ` إلى ${formatDate(period.to)}`}
                <br />
                المقارنة مع: {formatDate(prev.from)}
                {prev.from !== prev.to && ` إلى ${formatDate(prev.to)}`}
              </p>
            </div>
            <div className="rp-tools">
              <PeriodPicker period={period} today={today} onApply={goPeriod} />
              <button
                type="button"
                className="rp-btn"
                disabled={!canExport}
                title={canExport ? "تصدير أيام الفترة كاملة بصيغة CSV" : "لا توجد بيانات للتصدير"}
                onClick={() => report && downloadCsv(report)}
              >
                <Download size={18} aria-hidden /> تصدير CSV
              </button>
            </div>
          </header>

          <div className="rp-tabs" role="tablist" aria-label="أقسام التقارير">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`rp-tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls="rp-panel"
                className="rp-tab"
                data-active={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                {tab === t.key && (
                  <motion.span layoutId="rp-tab-ind" className="rp-tab-ind" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                )}
                <span className="rp-tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab + (pending ? "-p" : "")}
              id="rp-panel"
              role="tabpanel"
              aria-label={tabLabel}
              aria-labelledby={`rp-tab-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {body}
            </motion.div>
          </AnimatePresence>
        </div>

        <OrdersDrawer group={group} row={report?.statuses.find((s) => s.key === group)} period={period} onClose={closeDrawer} />
      </div>
    </MotionConfig>
  );
}
