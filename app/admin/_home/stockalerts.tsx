"use client";

import Link from "next/link";
import { Check, Package } from "lucide-react";
import type { Sec, StockData } from "../../../lib/admin/home-types";
import { fmtNum } from "./_lib/utils";
import SectionError from "./SectionError";

export default function StockAlerts({ sec }: { sec: Sec<StockData> }) {
  if (sec.state === "hidden") return null;
  if (sec.state === "error") return <SectionError title="المخزون يحتاج متابعة" />;

  const { items, total, listHref } = sec.data;
  return (
    <section className="hp-card">
      <div className="hp-card-head">
        <h2 className="hp-h2">المخزون يحتاج متابعة</h2>
        <Link className="hp-link" href={listHref}>
          عرض المخزون
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="hp-calm">
          <Check size={18} aria-hidden /> لا توجد تنبيهات مخزون حاليًا
        </p>
      ) : (
        <>
          <ul className="hp-list">
            {items.map((s) => (
              <li key={s.id} className="hp-row hp-row-stock">
                <span className="hp-row-ico">
                  <Package size={20} aria-hidden />
                </span>
                <span className="hp-row-txt">
                  <span className="hp-row-title">{s.name}</span>
                  <span className="hp-row-sub">
                    المتبقي: {fmtNum(s.qty)} · حد التنبيه: {fmtNum(s.threshold)}
                  </span>
                </span>
                <span className="hp-row-end">
                  <span className="hp-pill hp-tone" data-tone={s.state === "out" ? "red" : "amber"}>
                    {s.state === "out" ? "نافد" : "منخفض"}
                  </span>
                  <Link className="hp-link" href={s.href} aria-label={`فتح ${s.name}`}>
                    فتح
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          {total > items.length && (
            <p className="hp-note">
              عرض {items.length} من {fmtNum(total)} منتجات تحتاج متابعة.
            </p>
          )}
        </>
      )}
    </section>
  );
}
