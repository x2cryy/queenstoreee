"use client";

import { ChartColumn, Info, Package, Percent, TrendingUp } from "lucide-react";
import { KpiCard, Money } from "./parts";
import type { Report } from "../_lib/types";
import { fmtNum } from "../_lib/utils";

export default function ProfitTab({ report }: { report: Report }) {
  const { cur, prev, costsVisible } = report;

  if (!costsVisible) {
    return (
      <section className="rp-card">
        <div className="rp-empty">
          <Info size={28} aria-hidden />
          <p>
            <b>عرض الأرباح يتطلب صلاحية التكاليف</b>
          </p>
          <p>اطلب من مالك المتجر منح حسابك صلاحية عرض التكاليف.</p>
        </div>
      </section>
    );
  }

  const missing = cur.itemsMissing ?? 0;
  const unreliable = missing > 0 || (prev.itemsMissing ?? 0) > 0;
  const unknownRevenue = cur.revenueCosted === null ? null : Math.max(0, cur.netSales - cur.revenueCosted);

  return (
    <div className="rp-stack">
      <div className="rp-kpis">
        <KpiCard
          title="صافي المبيعات"
          icon={ChartColumn}
          value={cur.netSales}
          prev={prev.netSales}
          unit="money"
          note="الطلبات المسلّمة بعد الخصومات."
        />
        <KpiCard
          title="تكلفة البضاعة المسجلة"
          icon={Package}
          value={cur.cogsKnown}
          prev={prev.cogsKnown}
          unit="money"
          unreliable={unreliable}
          note="للبنود التي لها تكلفة محفوظة وقت البيع."
        />
        <KpiCard
          title={missing > 0 ? "الربح الإجمالي (تقديري)" : "الربح الإجمالي"}
          icon={TrendingUp}
          value={cur.grossProfitKnown}
          prev={prev.grossProfitKnown}
          unit="money"
          warn={missing > 0}
          unreliable={unreliable}
          note="قبل مصاريف التوصيل والدفع وأي مصاريف أخرى."
        />
        <KpiCard
          title="تغطية التكلفة"
          icon={Percent}
          value={cur.coveragePct}
          unit="pct"
          noDelta
          warn={missing > 0}
          note="نسبة المبيعات التي تتوفر لبنودها تكلفة مسجلة."
        />
      </div>

      <section className="rp-card">
        <h2 className="rp-h2">من المبيعات إلى الربح</h2>
        <div className="rp-lines">
          <div className="rp-line-row">
            <span>صافي المبيعات</span>
            <Money value={cur.netSales} />
          </div>
          <div className="rp-line-row">
            <span>منها: مبيعات بنود لها تكلفة مسجلة</span>
            <Money value={cur.revenueCosted} />
          </div>
          <div className="rp-line-row">
            <span>ناقص: تكلفة هذه البنود</span>
            <Money value={cur.cogsKnown} />
          </div>
          <div className="rp-line-row" data-strong="true">
            <span>الربح الإجمالي (قبل المصاريف)</span>
            <Money value={cur.grossProfitKnown} />
          </div>
          <div className="rp-line-row">
            <span>مبيعات بنود بلا تكلفة (غير داخلة في الربح)</span>
            <Money value={unknownRevenue} />
          </div>
        </div>
      </section>

      {missing > 0 ? (
        <p className="rp-warnbox" role="status">
          {fmtNum(missing)} بند مسلّم لا تتوفر له تكلفة مسجلة. لا نعتبر التكلفة المفقودة صفرًا، لذلك الربح المعروض تقديري
          ويشمل البنود المعروفة التكلفة فقط.
        </p>
      ) : null}
      <p className="rp-note">
        لا يُعرض صافي الربح لأن مصاريف التوصيل على المتجر ورسوم الدفع والمصاريف الأخرى غير مسجلة في النظام. المقارنة مع
        الفترة السابقة تُخفى عند نقص التكلفة في إحدى الفترتين.
      </p>
    </div>
  );
}
