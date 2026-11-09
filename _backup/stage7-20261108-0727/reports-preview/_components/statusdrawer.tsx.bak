"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Report, StatusKey } from "../_data/mock";
import { fmtMoney, fmtNum, formatDate } from "../_lib/utils";

export default function StatusDrawer({
  status,
  report,
  onClose,
}: {
  status: StatusKey | null;
  report: Report | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const row = report?.statuses.find((s) => s.key === status);
  const open = !!(status && report && row);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);

  const total = report?.cur.orders ?? 0;
  const pct = row && total ? Math.round((row.count / total) * 100) : 0;

  return (
    <AnimatePresence>
      {open && <motion.div key="scrim" className="rp-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}
      {open && report && row && status && (
        <motion.aside
          key="drawer"
          className="rp-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل الطلبات ${row.label}`}
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "tween", duration: 0.22 }}
        >
          <div className="rp-drawer-head">
            <div>
              <h2 className="rp-h2" style={{ margin: 0 }}>
                طلبات {row.label}
              </h2>
              <p className="rp-note" style={{ margin: "4px 0 0" }}>
                {formatDate(report.period.from)} إلى {formatDate(report.period.to)}
              </p>
            </div>
            <button ref={closeRef} type="button" className="rp-btn" onClick={onClose} aria-label="إغلاق">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="rp-drawer-body">
            <div className="rp-card">
              <div className="rp-kpi-val">
                <span className="rp-money">
                  <bdi dir="ltr">{fmtNum(row.count)}</bdi>
                  <span className="rp-unit">طلب</span>
                </span>
              </div>
              <p className="rp-note">{pct}% من طلبات الفترة</p>
            </div>
            <p className="rp-note" style={{ margin: 0 }}>
              نماذج من الطلبات (بيانات تجريبية). عند الربط الحقيقي يفتح هذا الزر قائمة الطلبات الكاملة.
            </p>
            <ul className="rp-list">
              {report.samples[status].map((o) => (
                <li key={`${o.id}-${o.date}`} className="rp-order">
                  <div className="rp-order-top">
                    <span>طلب رقم {o.id}</span>
                    <span>{fmtMoney(o.amount)}</span>
                  </div>
                  <div className="rp-order-sub">
                    <span>{o.customer}</span>
                    <span>{formatDate(o.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
