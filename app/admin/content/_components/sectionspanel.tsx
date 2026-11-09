"use client";

import { DEFAULT_SECTIONS, SECTION_LABELS, type HomeSection } from "../../../../lib/shop/site-content-types";
import Arrow from "./Arrow";

export default function SectionsPanel({
  sections,
  onChange,
}: {
  sections: HomeSection[];
  onChange: (next: HomeSection[]) => void;
}) {
  const patch = (i: number, p: Partial<HomeSection>) =>
    onChange(sections.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const n = sections.slice();
    const [x] = n.splice(i, 1);
    if (x) n.splice(j, 0, x);
    onChange(n);
  };

  return (
    <details className="ce-group">
      <summary>أقسام الصفحة الرئيسية</summary>
      <div className="ce-body">
        <p className="ce-hint">القسم الذي لا يحتوي منتجات يُخفى تلقائيًا في المتجر. اترك العنوان فارغًا لاستعمال الاسم الافتراضي.</p>
        {sections.map((s, i) => {
          const def = DEFAULT_SECTIONS.find((d) => d.id === s.id);
          return (
            <div className="ce-srow" key={s.id}>
              <div className="ce-srow-h">
                <strong>{SECTION_LABELS[s.id]}</strong>
                <div className="ce-btns">
                  <button type="button" className="ds-btn ce-sm" aria-label="تقديم" onClick={() => move(i, -1)} disabled={i === 0}>
                    <Arrow up />
                  </button>
                  <button type="button" className="ds-btn ce-sm" aria-label="تأخير" onClick={() => move(i, 1)} disabled={i === sections.length - 1}>
                    <Arrow />
                  </button>
                </div>
              </div>
              <label className="ce-check">
                <input type="checkbox" checked={s.visible} onChange={(e) => patch(i, { visible: e.target.checked })} />
                ظاهر في المتجر
              </label>
              <div className="ce-two">
                <div>
                  <label className="ds-label" htmlFor={`st-${s.id}`}>العنوان</label>
                  <input id={`st-${s.id}`} className="ds-input" maxLength={40} value={s.title} placeholder={def?.title} onChange={(e) => patch(i, { title: e.target.value })} />
                </div>
                <div>
                  <label className="ds-label" htmlFor={`sl-${s.id}`}>عدد العناصر</label>
                  <input
                    id={`sl-${s.id}`}
                    className="ds-input"
                    type="number"
                    min={1}
                    max={24}
                    value={s.limit}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (Number.isFinite(n)) patch(i, { limit: Math.min(24, Math.max(1, n)) });
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
