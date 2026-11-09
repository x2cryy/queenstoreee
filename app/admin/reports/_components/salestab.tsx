"use client";

import { useState } from "react";
import { ChartColumn, Receipt, Tag } from "lucide-react";
import { KpiCard, Money, ProductsPanel, StatusPanel } from "./parts";
import type { Report, StatusKey } from "../_lib/types";
import { fmtNum, formatDate } from "../_lib/utils";

export default function SalesTab({ report, onOpenStatus }: { report: Report; onOpenStatus: (k: StatusKey) => void }) {
  const { cur, prev } = report;
  const [shown, setShown] = useState(15);
  const days = report.daily.slice().reverse();

  return (
    <div className="rp-stack">
      <div className="rp-kpis">
        <KpiCard
          title="إجمالي المبيعات"
          icon={Receipt}
          value={cur.grossSales}
          prev={prev.grossSales}
          unit="money"
          note="قبل الخصومات، للطلبات المسلّمة، دون رسوم التوصيل."
        />
        <KpiCard
          title="الخصومات"
          icon={Tag}
          value={cur.discounts}
          unit="money"
          noDelta
          note="خصومات الطلبات المسلّمة كما حُفظت وقت الطلب."
        />
        <KpiCard
          title="صافي المبيعات"
          icon={ChartColumn}
          value={cur.netSales}
          prev={prev.netSales}
          unit="money"
          note="إجمالي المبيعات ناقص الخصومات."
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

      <div className="rp-grid2 rp-grid2--pair">
        <section className="rp-card">
          <div className="rp-card-head">
            <h2 className="rp-h2">المرتجعات والإلغاء</h2>
            <button type="button" className="rp-link" disabled={cur.ordersReturned === 0} onClick={() => onOpenStatus("returned")}>
              عرض المرتجعة
            </button>
          </div>
          <div className="rp-lines">
            <div className="rp-line-row">
              <span>طلبات مرتجعة بعد البيع</span>
              <b>{fmtNum(cur.ordersReturned)}</b>
            </div>
            <div className="rp-line-row">
              <span>طلبات ملغاة قبل التنفيذ</span>
              <b>{fmtNum(cur.ordersCancelled)}</b>
            </div>
          </div>
          <p className="rp-note">
            الطلب المرتجع يُستبعد من المبيعات كليًا ولا يُخصم مرة ثانية. النظام لا يسجّل الإرجاع الجزئي، ولذلك لا يظهر هنا.
            الأعداد لطلبات أُنشئت خلال الفترة.
          </p>
        </section>

        <section className="rp-card">
          <h2 className="rp-h2">مصادر المبالغ المحصلة</h2>
          <div className="rp-lines">
            <div className="rp-line-row">
              <span>دفعات الطلبات</span>
              <Money value={cur.collectedOrders} />
            </div>
            <div className="rp-line-row">
              <span>تحويلات كي كارد المؤكدة</span>
              <Money value={cur.collectedQi} />
            </div>
            {report.includesDebts ? (
              <div className="rp-line-row">
                <span>سداد ديون المتجر</span>
                <Money value={cur.collectedDebts} />
              </div>
            ) : null}
            {report.includesInstallments ? (
              <div className="rp-line-row">
                <span>أقساط المتجر</span>
                <Money value={cur.collectedInstallments} />
              </div>
            ) : null}
            <div className="rp-line-row" data-strong="true">
              <span>إجمالي المحصّل</span>
              <Money value={cur.collected} />
            </div>
          </div>
          <p className="rp-note">
            المسترد خلال الفترة: <Money value={cur.refunded} /> ولا يُخصم من المحصّل أعلاه. تحويل كي كارد يُحسب بتاريخ تأكيد الاستلام.
            {!report.includesDebts || !report.includesInstallments
              ? " بعض المصادر غير ظاهرة لعدم توفر صلاحيتها لحسابك."
              : ""}
          </p>
        </section>
      </div>

      <div className="rp-grid2 rp-grid2--pair">
        <StatusPanel statuses={report.statuses} onOpen={onOpenStatus} />
        <ProductsPanel products={report.topProducts} />
      </div>

      <section className="rp-card">
        <h2 className="rp-h2">تفصيل الأيام</h2>
        <div className="rp-table" role="table" aria-label="تفصيل المبيعات اليومي">
          <div className="rp-trow rp-trow--head" role="row">
            <span role="columnheader">التاريخ</span>
            <span role="columnheader">الطلبات</span>
            <span role="columnheader">صافي المبيعات (د.ع)</span>
            <span role="columnheader">المحصّل (د.ع)</span>
          </div>
          {days.slice(0, shown).map((d) => (
            <div key={d.date} className="rp-trow" role="row">
              <span role="cell">{formatDate(d.date)}</span>
              <span role="cell">{fmtNum(d.orders)}</span>
              <span role="cell">{fmtNum(d.netSales)}</span>
              <span role="cell">{fmtNum(d.collected)}</span>
            </div>
          ))}
        </div>
        {days.length > shown ? (
          <button type="button" className="rp-btn rp-more" onClick={() => setShown((n) => n + 15)}>
            عرض المزيد ({fmtNum(days.length - shown)} يوم)
          </button>
        ) : null}
      </section>
    </div>
  );
}
