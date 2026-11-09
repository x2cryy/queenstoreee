"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Order } from "../../../lib/admin/home-types";
import { PAY_TONE, STATUS_TONE, fullDateTime, tone } from "./_lib/orders";
import { fmtMoney } from "./_lib/utils";

export default function OrderDrawer({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = !!order;

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
      {order && (
        <motion.div key="scrim" className="hp-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      )}
      {order && (
        <motion.aside
          key="drawer"
          className="hp-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل الطلب رقم ${order.number}`}
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "tween", duration: 0.22 }}
        >
          <div className="hp-drawer-head">
            <div>
              <h2 className="hp-h2">
                طلب رقم <bdi dir="ltr">{order.number}</bdi>
              </h2>
              <p className="hp-note" style={{ margin: "4px 0 0" }}>
                {fullDateTime(order.createdAt)}
              </p>
            </div>
            <button ref={closeRef} type="button" className="hp-btn" onClick={onClose} aria-label="إغلاق">
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="hp-drawer-body">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="hp-pill hp-tone" data-tone={tone(STATUS_TONE, order.status)}>
                {order.statusLabel}
              </span>
              <span className="hp-pill hp-tone" data-tone={tone(PAY_TONE, order.pay)}>
                {order.payLabel}
              </span>
            </div>

            <dl className="hp-kv">
              <dt>العميل</dt>
              <dd>{order.customer}</dd>
              <dt>رقم الهاتف</dt>
              <dd>{order.phone ? <bdi dir="ltr">{order.phone}</bdi> : "غير متوفر"}</dd>
              <dt>المنطقة</dt>
              <dd>{order.place ?? "غير متوفرة"}</dd>
              <dt>العنوان</dt>
              <dd>{order.address ?? "غير متوفر"}</dd>
              {order.landmark && (
                <>
                  <dt>أقرب نقطة دالة</dt>
                  <dd>{order.landmark}</dd>
                </>
              )}
            </dl>

            <div>
              <h2 className="hp-h2" style={{ marginBottom: 8 }}>
                ملاحظات العميل
              </h2>
              {order.notes ? <p className="hp-notes">{order.notes}</p> : <p className="hp-note">لا توجد ملاحظات.</p>}
            </div>

            <div>
              <h2 className="hp-h2" style={{ marginBottom: 4 }}>
                المنتجات
              </h2>
              {order.items.length === 0 ? (
                <p className="hp-note">لا توجد أصناف مسجلة لهذا الطلب.</p>
              ) : (
                <ul>
                  {order.items.map((it, i) => (
                    <li key={`${it.name}-${i}`} className="hp-item">
                      <span className="hp-item-n">{i + 1}</span>
                      <span className="hp-item-name">{it.name}</span>
                      <span className="hp-item-total">{fmtMoney(it.line)}</span>
                      <span className="hp-item-sub">
                        {it.option ? `الخيار: ${it.option} · ` : ""}الكمية: {it.qty} × {fmtMoney(it.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="hp-sum">
                <span>المجموع</span>
                <span>{fmtMoney(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="hp-sum">
                  <span>الخصم</span>
                  <span>− {fmtMoney(order.discount)}</span>
                </div>
              )}
              {order.fee > 0 && (
                <div className="hp-sum">
                  <span>رسوم التوصيل</span>
                  <span>{fmtMoney(order.fee)}</span>
                </div>
              )}
              <div className="hp-sum hp-sum--total">
                <span>الإجمالي النهائي</span>
                <span>{fmtMoney(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="hp-drawer-foot">
            <Link className="hp-btn hp-btn--solid" href={`/admin/orders/${order.id}`}>
              فتح الطلب الكامل
            </Link>
            <Link className="hp-btn" href={`/print/order/${order.id}`} target="_blank" rel="noopener noreferrer">
              عرض الوصل
            </Link>
            {order.chatId && (
              <Link className="hp-btn" href="/admin/chats">
                فتح المحادثة
              </Link>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
