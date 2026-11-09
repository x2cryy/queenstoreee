"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Tab = "plans" | "payments";

export function InstTabs({
  initial,
  plansCount,
  paymentsCount,
  payments,
  children,
}: {
  initial: Tab;
  plansCount: number;
  paymentsCount: number;
  payments: ReactNode;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(initial);

  function pick(t: Tab) {
    setTab(t);
    try {
      window.history.replaceState(null, "", t === "payments" ? "?tab=payments" : window.location.pathname);
    } catch {}
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "plans", label: "الأقساط", count: plansCount },
    { key: "payments", label: "الدفعات", count: paymentsCount },
  ];

  return (
    <div>
      <div className="qa-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className="qa-tab"
            data-active={tab === t.key}
            onClick={() => pick(t.key)}
          >
            <span>{t.label}</span>
            <small className="qa-tab-count">{t.count}</small>
            {tab === t.key && (
              <motion.span
                layoutId="inst-tab-line"
                className="qa-tab-line"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "plans" ? children : payments}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
