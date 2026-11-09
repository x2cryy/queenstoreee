import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { fmtNum } from "../../../lib/admin/fmt";
import { PageHead, KpiGrid, Panel, Badge, Empty } from "../_components/ui";

type L = {
  id: number; action: string; actor_id: string | null; created_at: string;
  details: Record<string, unknown> | null; entity_id: string | null; entity_type: string | null;
};
type Tone = "good" | "info" | "bad";

const ACTIONS: Record<string, [string, Tone]> = {
  insert: ["إضافة", "good"], update: ["تعديل", "info"], delete: ["حذف", "bad"],
};
const ENTITIES: Record<string, string> = {
  products: "المنتجات", product_variants: "متغيرات المنتجات", categories: "التصنيفات",
  orders: "الطلبات", customers: "الزبائن", banners: "البنرات", site_settings: "إعدادات الموقع",
  admin_users: "المدراء والصلاحيات", inventory_movements: "حركات المخزون", coupons: "الكوبونات",
};
const ROLES: Record<string, string> = { owner: "مالك", manager: "مدير" };

const entityLabel = (e: string | null) => (e ? ENTITIES[e] ?? e : "-");
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));

function summary(l: L): string {
  const d = l.details ?? {};
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : null);
  const role = s("role");
  const v = s("name") ?? s("title") ?? s("full_name") ?? s("key") ?? (role ? ROLES[role] ?? role : null);
  return v ?? (l.entity_id ? l.entity_id.slice(0, 8) : "-");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; e?: string }>;
}) {
  await requireAnyPermission(["activity_logs"]);
  const sp = await searchParams;
  const sb = await createClient();
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00+03:00`).toISOString();
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();

  let lq = sb
    .from("activity_logs")
    .select("id,action,actor_id,created_at,details,entity_id,entity_type")
    .order("created_at", { ascending: false })
    .limit(100);
  if (sp.a && ACTIONS[sp.a]) lq = lq.eq("action", sp.a);
  if (sp.e) lq = lq.eq("entity_type", sp.e);

  const [list, t, w, recent] = await Promise.all([
    lq,
    sb.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    sb.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    sb.from("activity_logs").select("actor_id,entity_type").order("created_at", { ascending: false }).limit(500),
  ]);

  if (list.error) {
    return (
      <section>
        <PageHead title="سجل النشاطات" />
        <Panel><Empty>تعذّر تحميل السجل. حدّث الصفحة وحاول مجدداً.</Empty></Panel>
      </section>
    );
  }

  const logs = (list.data ?? []) as L[];
  const rec = (recent.data ?? []) as { actor_id: string | null; entity_type: string | null }[];
  const counts = new Map<string, number>();
  for (const r of rec) if (r.actor_id) counts.set(r.actor_id, (counts.get(r.actor_id) ?? 0) + 1);
  const ids = Array.from(new Set([...counts.keys(), ...logs.map((l) => l.actor_id).filter((x): x is string => !!x)]));
  const names = new Map<string, string>();
  if (ids.length) {
    const p = await sb.from("profiles").select("id,full_name").in("id", ids);
    for (const x of (p.data ?? []) as { id: string; full_name: string | null }[]) {
      if (x.full_name) names.set(x.id, x.full_name);
    }
  }
  let topId: string | null = null;
  let topN = 0;
  for (const [id, n] of counts) if (n > topN) { topN = n; topId = id; }
  const entities = Array.from(new Set(rec.map((r) => r.entity_type).filter((x): x is string => !!x)));
  const who = (id: string | null) => (id ? names.get(id) ?? "مستخدم" : "النظام");

  return (
    <section>
      <PageHead title="سجل النشاطات" desc="كل التغييرات على البيانات: من نفّذها ومتى." />
      <KpiGrid
        items={[
          { label: "عمليات اليوم", value: fmtNum(t.count ?? 0) },
          { label: "آخر 7 أيام", value: fmtNum(w.count ?? 0) },
          { label: "الأكثر نشاطاً", value: topId ? who(topId) : "-", hint: topId ? `${fmtNum(topN)} عملية (آخر 500)` : undefined },
        ]}
      />
      <Panel title="السجل">
        <form method="get" className="ds-filters">
          <select className="ds-select" style={{ flex: "1 1 140px" }} name="a" defaultValue={sp.a ?? ""}>
            <option value="">كل العمليات</option>
            <option value="insert">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
          </select>
          <select className="ds-select" style={{ flex: "1 1 160px" }} name="e" defaultValue={sp.e ?? ""}>
            <option value="">كل الأقسام</option>
            {entities.map((e) => <option key={e} value={e}>{entityLabel(e)}</option>)}
          </select>
          <button className="ds-btn ds-btn-gold" type="submit">تطبيق</button>
        </form>
        {logs.length === 0 ? (
          <Empty>لا توجد سجلات مطابقة.</Empty>
        ) : (
          <table className="ds-table">
            <thead><tr><th>العملية</th><th>القسم</th><th>التفاصيل</th><th>المنفّذ</th><th>الوقت</th></tr></thead>
            <tbody>
              {logs.map((l) => {
                const a = ACTIONS[l.action];
                return (
                  <tr key={l.id}>
                    <td data-label="العملية">{a ? <Badge tone={a[1]}>{a[0]}</Badge> : <Badge>{l.action}</Badge>}</td>
                    <td data-label="القسم">{entityLabel(l.entity_type)}</td>
                    <td data-label="التفاصيل">{summary(l)}</td>
                    <td data-label="المنفّذ">{who(l.actor_id)}</td>
                    <td data-label="الوقت"><span dir="ltr">{fmtTime(l.created_at)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {logs.length === 100 ? <p className="ds-desc">يعرض أحدث 100 سجل. استخدم الفلاتر لتضييق النتائج.</p> : null}
      </Panel>
    </section>
  );
}
