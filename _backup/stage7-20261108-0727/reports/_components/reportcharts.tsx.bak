"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fmtIQD } from "../../../../lib/admin/fmt";
import type { Day, Bar } from "../_chart_data";

export function Fade({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  );
}

export function DailyChart({ days }: { days: Day[] }) {
  const max = Math.max(0, ...days.map((d) => Math.max(d.revenue, d.collected)));
  if (!days.length || max === 0) {
    return <p className="qs-muted qs-chart-empty">لا توجد بيانات في هذه الفترة.</p>;
  }
  const step = Math.max(1, Math.ceil(days.length / 8));
  return (
    <div>
      <div className="qr-legend">
        <span data-k="rev">المبيعات</span>
        <span data-k="col">المحصّل</span>
      </div>
      <div className="qr-bars" role="img" aria-label="المبيعات والتحصيل اليومي">
        {days.map((d, i) => {
          const h1 = d.revenue > 0 ? Math.max(3, (d.revenue / max) * 100) : 0;
          const h2 = d.collected > 0 ? Math.max(3, (d.collected / max) * 100) : 0;
          const show = (days.length - 1 - i) % step === 0;
          return (
            <div
              key={d.date + i}
              className="qr-col"
              title={d.date + " - " + fmtIQD(d.revenue) + " - " + d.orders + " طلب"}
            >
              <div className="qr-track">
                <motion.div
                  className="qr-bar"
                  data-k="rev"
                  initial={{ height: 0 }}
                  animate={{ height: h1 + "%" }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.01, 0.4) }}
                />
                <motion.div
                  className="qr-bar"
                  data-k="col"
                  initial={{ height: 0 }}
                  animate={{ height: h2 + "%" }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.01, 0.4) }}
                />
              </div>
              <span className="qr-lbl" data-hide={!show}>
                {d.date.slice(8) + "/" + d.date.slice(5, 7)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HBars({ items }: { items: Bar[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="qr-hbars">
      {items.map((it, i) => (
        <div key={it.name + i} className="qr-hrow">
          <div className="qr-hhead">
            <span className="qr-hname">{it.name}</span>
            <b>{it.text}</b>
          </div>
          <div className="qr-htrack">
            <motion.div
              className="qr-hfill"
              initial={{ width: 0 }}
              animate={{ width: Math.max(2, (it.value / max) * 100) + "%" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
