import type { ReactNode } from "react";
import { Panel } from "./Charts";
import { STATUS_LABELS } from "../../../lib/admin/charts";
import { formatCount, formatDateTime, formatMoney } from "../../../lib/admin/format";
import type { Activity, Section } from "../../../lib/admin/activity";

function Feed<T extends { id: string | number }>({
  s,
  empty,
  render,
}: {
  s: NonNullable<Section<T>>;
  empty: string;
  render: (row: T) => ReactNode;
}) {
  if (s.state === "error") return <p className="qs-muted">تعذّر تحميل هذا القسم.</p>;
  if (s.rows.length === 0) return <p className="qs-muted">{empty}</p>;
  return (
    <ul className="qs-feed">
      {s.rows.map((r) => (
        <li key={r.id}>{render(r)}</li>
      ))}
    </ul>
  );
}

export function ActivitySection({ data }: { data: Activity }) {
  if (!data.orders && !data.products && !data.logs && !data.stock) return null;
  return (
    <>
      <h2 className="qs-section-title">آخر النشاطات</h2>
      <div className="qs-charts">
        {data.stock && (
          <Panel title="تنبيهات المخزون">
            <Feed
              s={data.stock}
              empty="لا توجد تنبيهات مخزون."
              render={(r) => (
                <>
                  <div className="qs-feed-main">
                    <span>{r.name}</span>
                    <span className="qs-tag" data-tone="warn">{r.out ? "نافد" : "منخفض: " + formatCount(r.quantity)}</span>
                  </div>
                </>
              )}
            />
          </Panel>
        )}
        {data.orders && (
          <Panel title="آخر الطلبات">
            <Feed
              s={data.orders}
              empty="لا توجد طلبات بعد."
              render={(r) => (
                <>
                  <div className="qs-feed-main">
                    <span>{r.customer_name}</span>
                    <strong>{formatMoney(Number(r.total) || 0)}</strong>
                  </div>
                  <div className="qs-feed-sub">
                    <span className="qs-tag">{STATUS_LABELS[r.status] ?? r.status}</span>
                    <span>{formatDateTime(r.created_at)}</span>
                  </div>
                </>
              )}
            />
          </Panel>
        )}
        {data.products && (
          <Panel title="آخر المنتجات">
            <Feed
              s={data.products}
              empty="لا توجد منتجات بعد."
              render={(r) => {
                const added = Math.abs(new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) < 2000;
                return (
                  <>
                    <div className="qs-feed-main">
                      <span>{r.name}</span>
                      <span className="qs-tag">{added ? "أُضيف" : "عُدّل"}</span>
                    </div>
                    <div className="qs-feed-sub">
                      <span>{formatDateTime(r.updated_at)}</span>
                    </div>
                  </>
                );
              }}
            />
          </Panel>
        )}
        {data.logs && (
          <Panel title="آخر التغييرات الإدارية">
            <Feed
              s={data.logs}
              empty="لا توجد تغييرات مسجّلة."
              render={(r) => (
                <>
                  <div className="qs-feed-main">
                    <bdi dir="auto">{r.action}</bdi>
                    {r.entity_type && <span className="qs-tag"><bdi dir="auto">{r.entity_type}</bdi></span>}
                  </div>
                  <div className="qs-feed-sub">
                    <span>{r.actor ?? "مستخدم غير معروف"}</span>
                    <span>{formatDateTime(r.created_at)}</span>
                  </div>
                </>
              )}
            />
          </Panel>
        )}
      </div>
    </>
  );
}
