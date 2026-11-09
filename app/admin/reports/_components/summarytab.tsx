"use client";

import Link from "next/link";
import { ChartColumn, Check, Info, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CollectionChart from "./CollectionChart";
import { KpiCard, ProductsPanel, StatusPanel } from "./parts";
import type { AttentionKind, Report, StatusKey } from "../_lib/types";
import { fmtNum } from "../_lib/utils";

const ATTN: Record<AttentionKind, { label: string; icon: LucideIcon; tone: "amber" | "blue"; href: string }> = {
  missing_cost: { label: "بنود مسلّمة بلا تكلفة مسجلة", icon: Package, tone: "amber", href: "/admin/products" },
  qi_pending: { label: "تحويلات كي كارد بانتظار المراجعة", icon: Wallet, tone: "blue", href: "/admin/payments" },
  pending_orders: { label: "طلبات جديدة تنتظر التأكيد", icon: Receipt, tone: "blue", href: "/admin/orders/manage" },
};

export default function SummaryTab({ report, onOpenStatus }: { report: Report; onOpenStatus: (k: StatusKey) => void }) {
  const { cur, prev, costsVisible } = report;
  const missing = costsVisible ? (cur.itemsMissing ?? 0) : 0;
  const unreliable = costsVisible && (missing > 0 || (prev.itemsMissing ?? 0) > 0);

  return (
    <div className="rp-stack">
      <div className="rp-kpis">
        <KpiCard
          title="صافي المبيعات"
          icon={ChartColumn}
          value={cur.netSales}
          prev={prev.netSales}
          unit="money"
          note="طلبات مسلّمة بعد الخصومات، دون رسوم التوصيل. الطلب المرتجع يُستبعد كليًا."
        />
        <KpiCard
          title={missing > 0 ? "الربح الإجمالي (تقديري)" : "الربح الإجمالي"}
          icon={TrendingUp}
          value={costsVisible ? cur.grossProfitKnown : null}
          prev={costsVisible ? prev.grossProfitKnown : null}
          unit="money"
          warn={missing > 0}
          unreliable={unreliable}
          noDelta={!costsVisible}
          note={
            !costsVisible
              ? "يتطلب صلاحية عرض التكاليف."
              : missing > 0
                ? `يشمل البنود المعروفة التكلفة فقط، و${fmtNum(missing)} بند مسلّم بلا تكلفة مسجلة.`
                : "بعد تكلفة البضاعة وقبل مصاريف التوصيل والدفع."
          }
        />
        <KpiCard
          title="المبالغ المحصلة"
          icon={Wallet}
          value={cur.collected}
          prev={prev.collected}
          unit="money"
          note="مبالغ استُلمت خلال الفترة (طلبات وتحويلات وسداد ديون)، وهي غير المبيعات."
        />
        <KpiCard
          title="الطلبات المسلّمة"
          icon={Receipt}
          value={cur.ordersDelivered}
          prev={prev.ordersDelivered}
          unit="orders"
          note="طلبات سُلّمت خلال الفترة."
        />
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
                const m = ATTN[a.kind];
                const Icon = m.icon;
                return (
                  <li key={a.kind}>
                    <Link className="rp-row" href={m.href}>
                      <span className="rp-row-ico rp-tone" data-tone={m.tone}>
                        <Icon size={18} aria-hidden />
                      </span>
                      <span className="rp-row-label">{m.label}</span>
                      <span className="rp-count rp-tone" data-tone={m.tone}>
                        {fmtNum(a.count)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="rp-grid2 rp-grid2--pair">
        <StatusPanel statuses={report.statuses} onOpen={onOpenStatus} />
        <ProductsPanel products={report.topProducts} />
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

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rp-card" role="alert">
      <div className="rp-empty">
        <Info size={28} aria-hidden />
        <p>
          <b>تعذّر تحميل التقرير</b>
        </p>
        <p>لم نتمكن من جلب البيانات، وليس معنى ذلك أن القيم صفر. حاول مرة أخرى.</p>
        <button type="button" className="rp-btn" onClick={onRetry}>
          إعادة المحاولة
        </button>
      </div>
    </section>
  );
}

export function EmptyState() {
  return (
    <section className="rp-card">
      <div className="rp-empty">
        <ChartColumn size={28} aria-hidden />
        <p>
          <b>لا توجد بيانات في هذه الفترة</b>
        </p>
        <p>لا طلبات ولا مبالغ محصلة ضمن الفترة المختارة. جرّب فترة أخرى.</p>
      </div>
    </section>
  );
}
