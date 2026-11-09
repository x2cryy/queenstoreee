"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { MAX_DAYS, RANGES, diffDays, isISO, periodLabel, resolvePeriod, type Period } from "../_lib/utils";

export default function PeriodPicker({
  period,
  today,
  onApply,
}: {
  period: Period;
  today: string;
  onApply: (p: Period) => void;
}) {
  const [view, setView] = useState<null | "menu" | "custom">(null);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!view) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setView(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setView(null);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [view]);

  function openCustom() {
    setFrom(period.from);
    setTo(period.to);
    setErr("");
    setView("custom");
  }

  function applyCustom() {
    if (!isISO(from) || !isISO(to)) return setErr("اختر تاريخ البداية وتاريخ النهاية.");
    if (from > to) return setErr("تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.");
    if (to > today) return setErr("لا يمكن اختيار تاريخ بعد اليوم.");
    if (diffDays(from, to) >= MAX_DAYS) return setErr("الحد الأقصى للفترة سنة واحدة.");
    onApply({ key: "custom", from, to });
    setView(null);
  }

  return (
    <div className="rp-pick" ref={ref}>
      <button
        type="button"
        className="rp-btn"
        aria-haspopup="menu"
        aria-expanded={view !== null}
        onClick={() => setView(view ? null : "menu")}
      >
        <CalendarDays size={18} aria-hidden />
        <span>{periodLabel(period)}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      <AnimatePresence>
        {view && (
          <motion.div
            className="rp-pop"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
          >
            {view === "menu" ? (
              <div role="menu" aria-label="اختيار الفترة">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={period.key === r.key}
                    className="rp-opt"
                    onClick={() => {
                      onApply(resolvePeriod(r.key, today));
                      setView(null);
                    }}
                  >
                    <span>{r.label}</span>
                    {period.key === r.key && <Check size={16} aria-hidden />}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={period.key === "custom"}
                  className="rp-opt"
                  onClick={openCustom}
                >
                  <span>فترة مخصصة</span>
                  {period.key === "custom" && <Check size={16} aria-hidden />}
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  applyCustom();
                }}
              >
                <label className="rp-field">
                  تاريخ البداية
                  <input className="rp-input" type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} required />
                </label>
                <label className="rp-field">
                  تاريخ النهاية
                  <input className="rp-input" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} required />
                </label>
                {err && (
                  <p className="rp-err" role="alert">
                    {err}
                  </p>
                )}
                <div className="rp-actions">
                  <button type="submit" className="rp-btn rp-btn--solid">
                    تطبيق
                  </button>
                  <button type="button" className="rp-btn" onClick={() => setView(null)}>
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
