"use client";

import { motion } from "framer-motion";
import { Boxes, CalendarDays, Check, ChartColumn, Info, Minus, Package, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CollectionChart from "./CollectionChart";
import type { AttentionKind, Report, StatusKey } from "../_data/mock";
import { delta, fmtNum } from "../_lib/utils";

function Money({ value }: { value: number }) {
  return (
    <span className="rp-money">
      <bdi dir="ltr">{fmtNum(value)}</bdi>
      <span className="rp-unit">د.ع</span>
    </span>
  );
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  const d = delta(cur, prev);
  if (d === null) {
    return (
      <span className="rp-delta" data-tone="na">
        <Minus size={14} aria-hidden /> لا تتوفر مقارنة
      </span>
    );
  }
  if (Math.abs(d) < 0.05) {
    return (
      <span className="rp-delta" data-tone="neutral">
        <Minus size={14} aria-hidden /> دون تغيير عن الفترة السابقة
      </span>
    );
  }
  const up = d > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="rp-delta" data-tone={up ? "good" : "bad"}>
      <Icon size={14} aria-hidden />
      <bdi dir="ltr">
        {up ? "+" : "−"}
        {Math.abs(d).toFixed(1)}%
      </bdi>
      <span>عن الفترة السابقة</span>
    </span>
  );
}

const ATTN: Record<AttentionKind, { label: string; icon: LucideIcon; tone: "amber" | "red" | "blue" }> = {
  missing_cost: { label: "منتجات ناقصة التكلفة", icon: Package, tone: "amber" },
  late_installments: { label: "أقساط متأخرة", icon: CalendarDays, tone: "red" },
  pending_orders: { label: "طلبات تنتظر التأكيد", icon: Receipt, tone: "blue" },
  low_stock: { label: "مخزون منخفض", icon: Boxes, tone: "amber" },
};

const STATUS_TONE: Record<StatusKey, "green" | "blue" | "red" | "amber"> = {
  done: "green",
  processing: "blue",
  cancelled: "red",
  returned: "amber",
};

export default function SummaryTab({
  report,
  onOpenStatus,
}: {
  report: Report;
  onOpenStatus: (k: StatusKey) => void;
}) {
  const { cur, prev, missingCostItems: missing } = report;
  const total = cur.orders;

  const cards = [
    { key: "net", title: "صافي المبيعات", icon: ChartColumn, value: cur.netSales, prev: prev.netSales, money: true, note: "بعد خصم الخصومات والمرتجعات", warn: false },
    {
      key: "profit",
      title: missing > 0 ? "الربح (تقديري)" : "الربح",
      icon: TrendingUp,
      value: cur.profit,
      prev: prev.profit,
      money: true,
      note: missing > 0 ? `يستثني ${missing} منتجات تكلفتها غير مسجلة، لذا الرقم تقديري` : "إجمالي الربح بعد تكلفة البضاعة المباعة",
      warn: missing > 0,
    },
    { key: "collected", title: "المبالغ المحصلة", icon: Wallet, value: cur.collected, prev: prev.collected, money: true, note: "مبالغ مستلمة خلال الفترة، وهي غير المبيعات", warn: false },
    { key: "orders", title: "الطلبات", icon: Receipt, value: cur.orders, prev: prev.orders, money: false, note: "إجمالي الطلبات خلال الفترة", warn: false },
  ];

  return (
    <div className="rp-stack">
      <div className="rp-kpis">
        {cards.map((c) => (
          <article key={c.key} className="rp-card">
            <div className="rp-kpi-top">
              <span className="rp-kpi-ico">
                <c.icon size={18} aria-hidden />
              </span>
              {c.title}
            </div>
            <div className="rp-kpi-val">
              {c.money ? (
                <Money value={c.value} />
              ) : (
                <span className="rp-money">
                  <bdi dir="ltr">{fmtNum(c.value)}</bdi>
                  <span className="rp-unit">طلب</span>
                </span>
              )}
            </div>
            <Delta cur={c.value} prev={c.prev} />
            <p className="rp-note" data-warn={c.warn ? "true" : undefined}>
              {c.note}
            </p>
          </article>
        ))}
      </div>

      <div className="rp-grid2 rp-grid2--chart">
        <section className="rp-card">
          <h2 className="rp-h2">المبيعات والتحصيل</h2>
          <CollectionChart key={`${report.period.from}_${report.period.to}_${report.chart.length}`} points={report.chart} />
        </section>
        <section className="rp-card">
          <h2 className="rp-h2">يحتاج انتباهك</h2>
          {report.attention.length === 0 ? (
            <p className="rp-calm">
              <Check size={18} aria-hidden /> لا توجد تنبيهات تحتاج إجراء حاليًا
            </p>
          ) : (
            <ul className="rp-list">
              {report.attention.map((a) => {
                const meta = ATTN[a.kind];
                const Icon = meta.icon;
                return (
                  <li key={a.kind} className="rp-row">
                    <span className="rp-row-ico rp-tone" data-tone={meta.tone}>
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="rp-row-label">{meta.label}</span>
                    <span className="rp-count rp-tone" data-tone={meta.tone}>
                      {fmtNum(a.count)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="rp-grid2 rp-grid2--pair">
        <section className="rp-card">
          <h2 className="rp-h2">أداء الطلبات</h2>
          {total === 0 ? (
            <div className="rp-empty">
              <Receipt size={28} aria-hidden />
              <p>لا توجد طلبات في هذه الفترة.</p>
            </div>
          ) : (
            <ul>
              {report.statuses.map((s) => {
                const pct = total ? (s.count / total) * 100 : 0;
                return (
                  <li key={s.key} className="rp-status">
                    <span className="rp-status-name">{s.label}</span>
                    <span className="rp-track" aria-hidden>
                      <motion.span
                        className="rp-fill"
                        data-tone={STATUS_TONE[s.key]}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </span>
                    <strong className="rp-status-count">{fmtNum(s.count)}</strong>
                    <button
                      type="button"
                      className="rp-link"
                      disabled={s.count === 0}
                      aria-label={`عرض تفاصيل الطلبات ${s.label}`}
                      onClick={() => onOpenStatus(s.key)}
                    >
                      عرض التفاصيل
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rp-card">
          <div className="rp-card-head">
            <h2 className="rp-h2">أفضل المنتجات</h2>
            <button type="button" className="rp-link" disabled title="يتوفر مع تبويب المبيعات والأرباح (الخطوة التالية)">
              عرض التفاصيل
            </button>
          </div>
          {report.topProducts.length === 0 ? (
            <div className="rp-empty">
              <Package size={28} aria-hidden />
              <p>لا توجد مبيعات منتجات في هذه الفترة.</p>
            </div>
          ) : (
            <ul>
              {report.topProducts.map((p) => (
                <li key={p.name} className="rp-prod">
                  <span className="rp-thumb">
                    <Package size={20} aria-hidden />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p className="rp-prod-name">{p.name}</p>
                    <p className="rp-prod-sub">الكمية المباعة: {fmtNum(p.qty)} قطعة</p>
                  </div>
                  <div className="rp-prod-val">
                    <Money value={p.sales} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="rp-note">زر «عرض التفاصيل» معطّل الآن، وسيُفعَّل في الخطوة التالية مع تبويب المبيعات والأرباح.</p>
        </section>
      </div>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="rp-stack" aria-busy="true">
      <p className="rp-sr" role="status">
        جارٍ تحميل البيانات…
      </p>
      <div className="rp-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rp-card">
            <div className="rp-skel" style={{ height: 16, width: "50%" }} />
            <div className="rp-skel" style={{ height: 30, width: "70%", marginTop: 14 }} />
            <div className="rp-skel" style={{ height: 22, width: "60%", marginTop: 14 }} />
          </div>
        ))}
      </div>
      <div className="rp-grid2 rp-grid2--chart">
        <div className="rp-card">
          <div className="rp-skel" style={{ height: 260 }} />
        </div>
        <div className="rp-card">
          <div className="rp-skel" style={{ height: 260 }} />
        </div>
      </div>
    </div>
  );
}

export function ErrorState() {
  return (
    <section className="rp-card" role="alert">
      <div className="rp-empty">
        <Info size={28} aria-hidden />
        <p>
          <b>تعذّر تحميل التقرير</b>
        </p>
        <p>هذه حالة خطأ تجريبية لفحص التصميم فقط. للعودة اختر «بيانات» من أدوات فحص المعاينة أعلى الصفحة.</p>
      </div>
    </section>
  );
}
