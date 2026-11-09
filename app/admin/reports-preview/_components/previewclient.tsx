"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Download, FlaskConical, Info } from "lucide-react";
import PeriodPicker from "./PeriodPicker";
import SummaryTab, { ErrorState, SummarySkeleton } from "./SummaryTab";
import StatusDrawer from "./StatusDrawer";
import { MOCK_LABEL, getMockReport, type PreviewMode, type Report, type StatusKey } from "../_data/mock";
import { TABS, formatDate, previousPeriod, type Period, type TabKey } from "../_lib/utils";

const MODES: { key: PreviewMode; label: string }[] = [
  { key: "data", label: "بيانات" },
  { key: "empty", label: "فارغ" },
  { key: "loading", label: "تحميل" },
  { key: "error", label: "خطأ" },
];

function downloadCsv(report: Report) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: (string | number)[][] = [
    [MOCK_LABEL],
    [`الفترة: ${report.period.from} إلى ${report.period.to}`],
    [],
    ["التاريخ", "صافي المبيعات (د.ع)", "المبالغ المحصلة (د.ع)", "عدد الطلبات"],
    ...report.daily.map((d) => [d.date, d.netSales, d.collected, d.orders]),
  ];
  const csv = "\ufeff" + lines.map((l) => l.map(q).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reports-preview-sample_${report.period.from}_${report.period.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PendingTab({ label }: { label: string }) {
  return (
    <section className="rp-card">
      <div className="rp-empty">
        <Info size={28} aria-hidden />
        <p>
          <b>تبويب «{label}»</b>
        </p>
        <p>لم يُبنَ بعد. يُبنى في الخطوة التالية بعد مراجعتك لتبويب الملخص.</p>
      </div>
    </section>
  );
}

export default function PreviewClient({
  today,
  initialTab,
  initialPeriod,
}: {
  today: string;
  initialTab: TabKey;
  initialPeriod: Period;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [mode, setMode] = useState<PreviewMode>("data");
  const [openStatus, setOpenStatus] = useState<StatusKey | null>(null);

  const report = useMemo(
    () => (mode === "data" || mode === "empty" ? getMockReport(period, mode === "empty") : null),
    [period, mode],
  );
  const closeDrawer = useCallback(() => setOpenStatus(null), []);
  const prev = previousPeriod(period);

  // نحفظ التبويب والفترة في الرابط بدون إعادة تحميل الصفحة
  useEffect(() => {
    const p = new URLSearchParams({ t: tab, r: period.key });
    if (period.key === "custom") {
      p.set("from", period.from);
      p.set("to", period.to);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [tab, period]);

  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? "";
  const canExport = !!report && report.daily.length > 0;

  let body: React.ReactNode = null;
  if (tab !== "summary") body = <PendingTab label={tabLabel} />;
  else if (mode === "loading") body = <SummarySkeleton />;
  else if (mode === "error") body = <ErrorState />;
  else if (report) body = <SummaryTab report={report} onOpenStatus={setOpenStatus} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="rp-root" dir="rtl">
        <div className="rp-body">
          <div className="rp-strip">
            <span className="rp-badge">
              <FlaskConical size={16} aria-hidden /> {MOCK_LABEL}
            </span>
            <div className="rp-seg-wrap">
              <span>أدوات فحص المعاينة:</span>
              <div className="rp-seg" role="group" aria-label="حالة المعاينة">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    aria-pressed={mode === m.key}
                    onClick={() => {
                      setMode(m.key);
                      setOpenStatus(null);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
              <PeriodPicker
                period={period}
                today={today}
                onApply={(p) => {
                  setPeriod(p);
                  setOpenStatus(null);
                }}
              />
              <button
                type="button"
                className="rp-btn"
                disabled={!canExport}
                title={canExport ? "تصدير بيانات الفترة (تجريبي) بصيغة CSV" : "لا توجد بيانات للتصدير"}
                onClick={() => report && downloadCsv(report)}
              >
                <Download size={18} aria-hidden /> تصدير التقرير
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
              key={tab}
              id="rp-panel"
              role="tabpanel"
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

        <StatusDrawer status={openStatus} report={report} onClose={closeDrawer} />
      </div>
    </MotionConfig>
  );
}
