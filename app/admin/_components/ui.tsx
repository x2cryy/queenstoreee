import type { ReactNode } from "react";

type Tone = "good" | "warn" | "bad" | "info";

export function PageHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="ds-head">
      <div>
        <h1 className="ds-title">{title}</h1>
        {desc ? <p className="ds-desc">{desc}</p> : null}
      </div>
      {actions ? <div className="ds-actions">{actions}</div> : null}
    </div>
  );
}

export type Kpi = { label: string; value: string | number; hint?: string; tone?: Tone };

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="ds-kpis">
      {items.map((k) => (
        <div className="ds-kpi" key={k.label} data-tone={k.tone}>
          <span className="ds-kpi-label">{k.label}</span>
          <span className="ds-kpi-value">{k.value}</span>
          {k.hint ? <span className="ds-kpi-hint">{k.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="ds-panel">
      {title || action ? (
        <div className="ds-panel-head">
          <h2 className="ds-panel-title">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="ds-panel-body">{children}</div>
    </section>
  );
}

export function Badge({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return <span className="ds-badge" data-tone={tone}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="ds-empty">{children}</div>;
}
