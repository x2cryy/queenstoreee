"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { loadOrders, type OrderRow } from "../actions";
import type { StatusKey, StatusRow } from "../_lib/types";
import { fmtMoney, fmtNum, formatDate, type Period } from "../_lib/utils";

const baghdadDay = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t + 3 * 3600000).toISOString().slice(0, 10);
};

function DrawerList({ group, period }: { group: StatusKey; period: Period }) {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    loadOrders({ from: period.from, to: period.to, group, offset: 0 })
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setRows(r.rows);
          setTotal(r.total);
          setFailed(false);
        } else setFailed(true);
        setBusy(false);
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setBusy(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [group, period.from, period.to, nonce]);

  async function more() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await loadOrders({ from: period.from, to: period.to, group, offset: rows.length });
      if (r.ok) {
        setRows((x) => [...x, ...r.rows]);
        setTotal(r.total);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  function retry() {
    setBusy(true);
    setFailed(false);
    setNonce((n) => n + 1);
  }

  return (
    <>
      {busy && rows.length === 0 ? <div className="rp-skel" style={{ height: 120 }} aria-busy="true" /> : null}
      {failed ? (
        <div className="rp-empty" role="alert">
          <p>تعذّر تحميل الطلبات.</p>
          <button type="button" className="rp-btn" onClick={retry}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}
      {!busy && !failed && rows.length === 0 ? <p className="rp-note">لا توجد طلبات.</p> : null}
      <ul className="rp-list">
        {rows.map((o) => {
          const day = baghdadDay(o.created_at);
          return (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="rp-order">
                <div className="rp-order-top">
                  <span>
                    طلب رقم <bdi dir="ltr">{o.order_number}</bdi>
                  </span>
                  <span>{fmtMoney(o.total)}</span>
                </div>
                <div className="rp-order-sub">
                  <span>{o.customer_name ?? "-"}</span>
                  <span>{day ? formatDate(day) : ""}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {rows.length < total ? (
        <button type="button" className="rp-btn" disabled={busy} onClick={more}>
          {busy ? "جارٍ التحميل…" : `عرض المزيد (${fmtNum(total - rows.length)})`}
        </button>
      ) : null}
    </>
  );
}

export default function OrdersDrawer({
  group,
  row,
  period,
  onClose,
}: {
  group: StatusKey | null;
  row: StatusRow | undefined;
  period: Period;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = !!(group && row);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="scrim" className="rp-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      )}
      {open && group && row && (
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
                {formatDate(period.from)} إلى {formatDate(period.to)} · {fmtNum(row.count)} طلب
              </p>
            </div>
            <button ref={closeRef} type="button" className="rp-btn" onClick={onClose} aria-label="إغلاق">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="rp-drawer-body">
            <DrawerList key={`${group}|${period.from}|${period.to}`} group={group} period={period} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
