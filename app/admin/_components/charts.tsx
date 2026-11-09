import type { ReactNode } from "react";
import { formatCount } from "../../../lib/admin/format";

export function Panel({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="qs-panel" data-wide={wide}>
      <h3 className="qs-panel-title">{title}</h3>
      {children}
    </div>
  );
}

export function ChartError() {
  return <p className="qs-muted">تعذّر تحميل هذا الرسم. أعد تحميل الصفحة.</p>;
}

export function BarList({
  rows,
  empty,
}: {
  rows: { key: string; label: string; value: number }[];
  empty: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (max === 0) return <p className="qs-muted">{empty}</p>;
  return (
    <ul className="qs-hbars">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="qs-hbar-row">
            <span>{r.label}</span>
            <strong>{formatCount(r.value)}</strong>
          </div>
          <div className="qs-hbar-track">
            <div className="qs-hbar-fill" style={{ width: (r.value / max) * 100 + "%" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
