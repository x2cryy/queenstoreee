"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as RKeyboardEvent, PointerEvent as RPointerEvent } from "react";
import { ChartColumn } from "lucide-react";
import type { ChartPoint } from "../_data/mock";
import { fmtMoney, fmtShort, formatDate, shortDate } from "../_lib/utils";

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  return p * (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10);
};

const tipTitle = (p: ChartPoint) =>
  p.start === p.end ? formatDate(p.start) : `${shortDate(p.start)} – ${shortDate(p.end)}`;

export default function CollectionChart({ points }: { points: ChartPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // اللمس خارج الرسم يخفي التفاصيل
  useEffect(() => {
    if (active === null) return;
    const down = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [active]);

  const n = points.length;
  const H = Math.min(320, Math.max(220, Math.round(w * 0.42)));
  const m = { t: 12, r: 14, b: 28, l: w < 420 ? 66 : 74 };
  const iw = w - m.l - m.r;
  const ih = H - m.t - m.b;
  const maxV = niceMax(n ? Math.max(...points.flatMap((p) => [p.netSales, p.collected])) : 0);
  const x = (i: number) => (n <= 1 ? m.l + iw / 2 : m.l + (i / (n - 1)) * iw);
  const y = (v: number) => m.t + ih - (v / maxV) * ih;
  const path = (k: "netSales" | "collected") =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(" ");
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
  const a = active !== null && active < n ? active : null;
  const ticks = [0, 1, 2, 3, 4].map((k) => (maxV * k) / 4);

  const pick = (e: RPointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const frac = box.width ? (e.clientX - box.left) / box.width : 0;
    setActive(n <= 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1)))));
  };

  const onKey = (e: RKeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive((i) => Math.min(n - 1, (i ?? -1) + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((i) => Math.max(0, (i ?? n) - 1));
    } else if (e.key === "Escape") setActive(null);
  };

  const totalS = points.reduce((s, p) => s + p.netSales, 0);
  const totalC = points.reduce((s, p) => s + p.collected, 0);
  const pct = totalS > 0 ? Math.round((totalC / totalS) * 100) : 0;
  const best = n ? points.reduce((b, p) => (p.netSales > b.netSales ? p : b), points[0]) : null;

  return (
    <div>
      <div className="rp-legend">
        <span className="rp-legend-i">
          <i className="rp-legend-line" /> صافي المبيعات (خط متصل)
        </span>
        <span className="rp-legend-i">
          <i className="rp-legend-line" data-kind="coll" /> المبالغ المحصلة (خط متقطع)
        </span>
      </div>

      <div className="rp-chart" ref={wrapRef}>
        {n === 0 ? (
          <div className="rp-empty">
            <ChartColumn size={28} aria-hidden />
            <p>لا توجد بيانات للمبيعات والتحصيل في هذه الفترة.</p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${w} ${H}`}
              style={{ direction: "ltr" }}
              role="img"
              aria-label="رسم خطي للمبيعات والتحصيل. استخدم أسهم لوحة المفاتيح أو اللمس لعرض التفاصيل."
              tabIndex={0}
              onKeyDown={onKey}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line className="rp-gridline" x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} />
                  <text className="rp-axis" x={m.l - 8} y={y(t) + 4} textAnchor="end">
                    {fmtShort(t)}
                  </text>
                </g>
              ))}
              {points.map(
                (p, i) =>
                  i % step === 0 && (
                    <text key={p.start} className="rp-axis" x={x(i)} y={H - 8} textAnchor="middle">
                      {shortDate(p.start)}
                    </text>
                  ),
              )}
              <path className="rp-line rp-line-sales" d={path("netSales")} />
              <path className="rp-line rp-line-coll" d={path("collected")} />
              {n <= 31 &&
                points.map((p, i) => (
                  <g key={p.start}>
                    <circle className="rp-dot-sales" cx={x(i)} cy={y(p.netSales)} r={3} />
                    <circle className="rp-dot-coll" cx={x(i)} cy={y(p.collected)} r={3} />
                  </g>
                ))}
              {a !== null && (
                <g>
                  <line className="rp-guide" x1={x(a)} x2={x(a)} y1={m.t} y2={m.t + ih} />
                  <circle className="rp-dot-sales" cx={x(a)} cy={y(points[a].netSales)} r={5.5} />
                  <circle className="rp-dot-coll" cx={x(a)} cy={y(points[a].collected)} r={5.5} />
                </g>
              )}
              <rect
                x={m.l}
                y={m.t}
                width={iw}
                height={ih}
                fill="transparent"
                style={{ touchAction: "pan-y" }}
                onPointerDown={pick}
                onPointerMove={pick}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setActive(null);
                }}
              />
            </svg>
            {a !== null && (
              <div className="rp-tip" style={{ left: Math.min(Math.max(x(a), 96), w - 96), transform: "translateX(-50%)" }}>
                <b>{tipTitle(points[a])}</b>
                <div className="rp-tip-row">
                  <span>
                    <i className="rp-legend-line rp-legend-line--sm" /> صافي المبيعات
                  </span>
                  <span>{fmtMoney(points[a].netSales)}</span>
                </div>
                <div className="rp-tip-row">
                  <span>
                    <i className="rp-legend-line rp-legend-line--sm" data-kind="coll" /> المحصل
                  </span>
                  <span>{fmtMoney(points[a].collected)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {best && (
        <p className="rp-chart-sum">
          أعلى مبيعات: {fmtMoney(best.netSales)} (
          {best.start === best.end ? formatDate(best.start) : `الأسبوع الذي يبدأ ${formatDate(best.start)}`}). إجمالي المحصل {fmtMoney(totalC)} من {fmtMoney(totalS)} صافي مبيعات ({pct}%).
          {n > 31 && " كل نقطة في الرسم تمثل أسبوعًا."}
        </p>
      )}
    </div>
  );
}
