"use client";

import Link from "next/link";
import { Info, Lock, Minus, Package, Receipt, ShoppingBag, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metric, Summary } from "../../../lib/admin/home-types";
import { fmtNum } from "./_lib/utils";
import Retry from "./Retry";

function Delta({ cur, prev, down }: { cur: number; prev: number | null; down: "bad" | "neutral" }) {
  if (prev === null) {
    return (
      <span className="hp-delta" data-tone="na">
        <Minus size={14} aria-hidden /> لا تتوفر مقارنة
      </span>
    );
  }
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(d) < 0.05) {
    return (
      <span className="hp-delta" data-tone="neutral">
        <Minus size={14} aria-hidden /> دون تغيير عن أمس
      </span>
    );
  }
  const up = d > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="hp-delta" data-tone={up ? "good" : down}>
      <Icon size={14} aria-hidden />
      <bdi dir="ltr">
        {up ? "+" : "−"}
        {Math.abs(d).toFixed(1)}%
      </bdi>
      <span>عن أمس</span>
    </span>
  );
}

type Def = {
  key: string;
  title: string;
  icon: LucideIcon;
  metric: Metric;
  unit: string;
  note: string;
  compare: boolean;
  down?: "bad" | "neutral";
  href: string;
  cta: string;
};

export default function SummaryCards({ summary: s }: { summary: Summary }) {
  const cards: Def[] = [
    {
      key: "new",
      title: "الطلبات الجديدة اليوم",
      icon: Receipt,
      metric: s.newToday,
      unit: "طلب",
      note: "كل الطلبات التي أُنشئت اليوم، وتشمل الملغاة",
      compare: true,
      down: "neutral",
      href: "/admin/orders",
      cta: "عرض الطلبات",
    },
    {
      key: "processing",
      title: "الطلبات قيد التجهيز",
      icon: Package,
      metric: s.processing,
      unit: "طلب",
      note: "الطلبات الحالية قيد التجهيز أو الجاهزة، وقد تكون من أيام سابقة",
      compare: false,
      href: "/admin/orders/live",
      cta: "الطلبات المباشرة",
    },
    {
      key: "sales",
      title: "مبيعات اليوم",
      icon: ShoppingBag,
      metric: s.sales,
      unit: "د.ع",
      note: "صافي مبيعات الطلبات المسلَّمة اليوم بعد الخصم، دون رسوم التوصيل (حسب تعريف التقارير)",
      compare: true,
      down: "bad",
      href: "/admin/reports",
      cta: "فتح التقارير",
    },
    {
      key: "collected",
      title: "المبالغ المحصلة اليوم",
      icon: Wallet,
      metric: s.collected,
      unit: "د.ع",
      note: "مدفوعات ناجحة سُجّلت اليوم، وليست كل مبالغ الطلبات",
      compare: true,
      down: "bad",
      href: "/admin/reports",
      cta: "فتح التقارير",
    },
  ];

  return (
    <div className="hp-kpis">
      {cards.map((c) => (
        <article key={c.key} className="hp-card">
          <div className="hp-kpi-top">
            <span className="hp-kpi-ico">
              <c.icon size={18} aria-hidden />
            </span>
            {c.title}
          </div>

          {c.metric.state === "ok" ? (
            <>
              <div className="hp-kpi-val">
                <span className="hp-money">
                  <bdi dir="ltr">{fmtNum(c.metric.data.value)}</bdi>
                  <span className="hp-unit">{c.unit}</span>
                </span>
              </div>
              {c.compare && <Delta cur={c.metric.data.value} prev={c.metric.data.prev} down={c.down ?? "neutral"} />}
              <p className="hp-note">{c.note}</p>
              <Link className="hp-link hp-kpi-link" href={c.href}>
                {c.cta}
              </Link>
            </>
          ) : c.metric.state === "hidden" ? (
            <>
              <p className="hp-na">
                <Lock size={16} aria-hidden /> غير متاح لصلاحياتك
              </p>
              <p className="hp-note">{c.note}</p>
            </>
          ) : (
            <>
              <p className="hp-na" role="alert">
                <Info size={16} aria-hidden /> تعذّر تحميل هذه البطاقة
              </p>
              <div className="hp-na-row">
                <Retry />
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
