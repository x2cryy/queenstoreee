"use client";

import { useEffect, useState, type ReactNode } from "react";

function msLeft(): number {
  const n = new Date();
  const e = new Date(n);
  e.setHours(24, 0, 0, 0);
  return Math.max(0, e.getTime() - n.getTime());
}

const p2 = (n: number) => String(n).padStart(2, "0");

export default function Deals({ title, children }: { title: string; children: ReactNode }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    setMs(msLeft());
    const t = setInterval(() => setMs(msLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const s = ms === null ? null : Math.floor(ms / 1000);
  const parts = s === null ? ["--", "--", "--"] : [p2(Math.floor(s / 3600)), p2(Math.floor((s % 3600) / 60)), p2(s % 60)];

  return (
    <section className="qm-sec qm-wrap qx-deals" aria-label={title}>
      <div className="qm-sec-h">
        <h2>{title}</h2>
        <div className="qx-count" dir="ltr" aria-label="الوقت المتبقي">
          <span>{parts[0]}</span>:<span>{parts[1]}</span>:<span>{parts[2]}</span>
        </div>
      </div>
      <div className="qm-grid">{children}</div>
    </section>
  );
}
