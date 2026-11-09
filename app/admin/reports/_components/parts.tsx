"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Minus, Package, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StatusKey, StatusRow, TopProduct } from "../_lib/types";
import { delta, fmtNum } from "../_lib/utils";

export function Money({ value }: { value: number | null }) {
  return (
    <span className="rp-money">
      <bdi dir="ltr">{value === null ? "—" : fmtNum(value)}</bdi>
      {value === null ? null : <span className="rp-unit">د.ع</span>}
    </span>
  );
}

export function Delta({ cur, prev, unreliable }: { cur: number | null; prev: number | null; unreliable?: boolean }) {
  if (cur === null || prev === null || unreliable) {
    return (
      <span className="rp-delta" data-tone="na">
        <Minus size={14} aria-hidden /> {unreliable ? "لا تتوفر مقارنة موثوقة" : "لا تتوفر مقارنة"}
      </span>
    );
  }
  const d = delta(cur, prev);
  if (d === null) {
    return (
      <span className="rp-delta" data-tone="na">
        <Minus size={14} aria-hidden /> لا تتوفر مقارنة
      </span>
    );
  }
  if (Math.abs(d) < 0.05) {
    return (
      <span className="rp-delta" data-tone="neutral">
        <Minus size={14} aria-hidden /> دون تغيير عن الفترة السابقة
      </span>
    );
  }
  const up = d > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="rp-delta" data-tone={up ? "good" : "bad"}>
      <Icon size={14} aria-hidden />
      <bdi dir="ltr">
        {up ? "+" : "−"}
        {Math.abs(d).toFixed(1)}%
      </bdi>
      <span>عن الفترة السابقة</span>
    </span>
  );
}

type Unit = "money" | "orders" | "pct";
const show = (v: number, unit: Unit) => (unit === "pct" ? String(Math.round(v * 10) / 10) : fmtNum(v));

export function KpiCard({
  title,
  icon: Icon,
  value,
  prev,
  unit,
  note,
  warn,
  unreliable,
  noDelta,
}: {
  title: string;
  icon: LucideIcon;
  value: number | null;
  prev?: number | null;
  unit: Unit;
  note: string;
  warn?: boolean;
  unreliable?: boolean;
  noDelta?: boolean;
}) {
  return (
    <article className="rp-card">
      <div className="rp-kpi-top">
        <span className="rp-kpi-ico">
          <Icon size={18} aria-hidden />
        </span>
        {title}
      </div>
      <div className="rp-kpi-val">
        {unit === "money" ? (
          <Money value={value} />
        ) : (
          <span className="rp-money">
            <bdi dir="ltr">{value === null ? "—" : show(value, unit)}</bdi>
            {value === null ? null : <span className="rp-unit">{unit === "pct" ? "%" : "طلب"}</span>}
          </span>
        )}
      </div>
      {noDelta ? null : <Delta cur={value} prev={prev ?? null} unreliable={unreliable} />}
      <p className="rp-note" data-warn={warn ? "true" : undefined}>
        {note}
      </p>
    </article>
  );
}

const STATUS_TONE: Record<StatusKey, "green" | "blue" | "red" | "amber"> = {
  done: "green",
  processing: "blue",
  cancelled: "red",
  returned: "amber",
};

export function StatusPanel({ statuses, onOpen }: { statuses: StatusRow[]; onOpen: (k: StatusKey) => void }) {
  const total = statuses.reduce((s, x) => s + x.count, 0);
  return (
    <section className="rp-card">
      <h2 className="rp-h2">أداء الطلبات</h2>
      <p className="rp-note" style={{ marginTop: -6, marginBottom: 6 }}>
        طلبات أُنشئت خلال الفترة، موزعة حسب حالتها الحالية.
      </p>
      {total === 0 ? (
        <div className="rp-empty">
          <Receipt size={28} aria-hidden />
          <p>لا توجد طلبات في هذه الفترة.</p>
        </div>
      ) : (
        <ul>
          {statuses.map((s) => {
            const pct = total ? (s.count / total) * 100 : 0;
            return (
              <li key={s.key} className="rp-status">
                <span className="rp-status-name">{s.label}</span>
                <span className="rp-track" aria-hidden>
                  <motion.span
                    className="rp-fill"
                    data-tone={STATUS_TONE[s.key]}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </span>
                <strong className="rp-status-count">{fmtNum(s.count)}</strong>
                <button
                  type="button"
                  className="rp-link"
                  disabled={s.count === 0}
                  aria-label={`عرض تفاصيل الطلبات ${s.label}`}
                  onClick={() => onOpen(s.key)}
                >
                  عرض التفاصيل
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ProductsPanel({ products }: { products: TopProduct[] }) {
  return (
    <section className="rp-card">
      <h2 className="rp-h2">أفضل المنتجات</h2>
      {products.length === 0 ? (
        <div className="rp-empty">
          <Package size={28} aria-hidden />
          <p>لا توجد مبيعات منتجات في هذه الفترة.</p>
        </div>
      ) : (
        <ul>
          {products.map((p, i) => {
            const inner = (
              <>
                <span className="rp-thumb">
                  <Package size={20} aria-hidden />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className="rp-prod-name">{p.name}</p>
                  <p className="rp-prod-sub">الكمية المباعة: {fmtNum(p.qty)} قطعة</p>
                </div>
                <div className="rp-prod-val">
                  <Money value={p.sales} />
                </div>
              </>
            );
            return (
              <li key={`${p.id ?? p.name}-${i}`} className="rp-prod-li">
                {p.id ? (
                  <Link className="rp-prod" href={`/admin/products/${p.id}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className="rp-prod">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="rp-note">المبيعات بعد توزيع خصم الطلب، للطلبات المسلّمة خلال الفترة.</p>
    </section>
  );
}
