"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatCount, formatMoney } from "../../../lib/admin/format";
import type { DayPoint } from "../../../lib/admin/charts";

export function SalesChart({ days }: { days: DayPoint[] }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const data = days.slice(-period);
  const max = Math.max(0, ...data.map((d) => d.total));
  const sum = data.reduce((s, d) => s + d.total, 0);
  const orders = data.reduce((s, d) => s + d.count, 0);
  const step = period === 7 ? 1 : 5;

  return (
    <div>
      <div className="qs-chart-head">
        <div>
          <div className="qs-card-val">{formatMoney(sum)}</div>
          <div className="qs-card-hint">
            {formatCount(orders)} طلب خلال آخر {period} يوماً (غير الملغاة)
          </div>
        </div>
        <div className="qs-seg" role="group" aria-label="الفترة الزمنية">
          {([7, 30] as const).map((p) => (
            <button key={p} type="button" data-on={period === p} onClick={() => setPeriod(p)}>
              {p} يوماً
            </button>
          ))}
        </div>
      </div>

      {max === 0 ? (
        <p className="qs-muted qs-chart-empty">لا توجد مبيعات في هذه الفترة.</p>
      ) : (
        <div className="qs-bars" key={period}>
          {data.map((d, i) => {
            const pct = d.total > 0 ? Math.max(3, (d.total / max) * 100) : 0;
            const showLabel = (data.length - 1 - i) % step === 0;
            return (
              <div key={d.date} className="qs-bar-col" title={d.label + " — " + formatMoney(d.total) + " — " + d.count + " طلب"}>
                <div className="qs-bar-track">
                  <motion.div
                    className="qs-bar"
                    initial={{ height: 0 }}
                    animate={{ height: pct + "%" }}
                    transition={{ duration: 0.35, delay: i * 0.01 }}
                  />
                </div>
                <span className="qs-bar-lbl">{showLabel ? d.label : "\u00a0"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
