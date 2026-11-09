"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Tab = { key: string; label: string; count?: number; content: ReactNode };

export function CustomerTabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(
    initial && tabs.some((t) => t.key === initial) ? initial : (tabs[0]?.key ?? ""),
  );
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div>
      <div className="qa-tabs" role="tablist" style={{ flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className="qa-tab"
            data-active={active === t.key}
            onClick={() => setActive(t.key)}
          >
            <span>{t.label}</span>
            {t.count !== undefined ? <small className="qa-tab-count">{t.count}</small> : null}
            {active === t.key && (
              <motion.span
                layoutId="cust-tab-line"
                className="qa-tab-line"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current?.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {current?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
