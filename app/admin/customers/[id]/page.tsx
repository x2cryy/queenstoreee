import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { requireAnyPermission, getMyPermissions } from "../../../../lib/admin/access";
import { AccountPanel } from "./AccountPanel";
import { createClient } from "../../../../lib/supabase/server";
import { fmtIQD, fmtNum, fmtDate } from "../../../../lib/admin/fmt";
import { PageHead, KpiGrid, Panel, Badge, Empty } from "../../_components/ui";
import { CustomerTabs } from "./CustomerTabs";
import { NoteForm, DeleteNote } from "./NoteForm";
import { getRole } from "../../../../lib/auth/session";

const PAGE = 20;

type Customer = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  area: string | null;
  address: string | null;
  created_at: string;
};
type OrderRow = {
  id: string;
  order_number: string | null;
  total: number;
  status: string;
  payment_status: string | null;
  created_at: string;
};
type D = {
  id: string;
  direction: string | null;
  reason: string | null;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: string | null;
  order_id?: string | null;
};
type I = {
  direction: string | null;
  id: string;
  title: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string | null;
  start_date: string | null;
  order_id?: string | null;
};
type Fav = { id: string; product_id: string; created_at: string };
type Log = { id: number; action: string; entity_type: string | null; created_at: string };
type Note = { id: string; body: string; created_at: string };
type Summary = {
  orders_live: number;
  orders_cancelled: number;
  orders_returned: number;
  returned_total: number;
  delivered_count: number;
  purchases_total: number;
  first_order_at: string | null;
  last_order_at: string | null;
};
type PurchaseRow = {
  order_id: string;
  order_number: string | null;
  ordered_at: string;
  product_name: string | null;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
};
type SP = { tab?: string; op?: string; pp?: string; sf?: string; st?: string };

const clampPage = (v?: string) =>
  Math.min(Math.max(Number.parseInt(v ?? "1", 10) || 1, 1), 100000);

function Pager({ total, page, href }: { total: number; page: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (pages <= 1) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        marginTop: 12,
      }}
    >
      <span className="ds-desc">صفحة {fmtNum(page)} من {fmtNum(pages)}</span>
      <span style={{ display: "inline-flex", gap: 8 }}>
        {page > 1 ? <Link className="ds-btn" href={href(page - 1)}>السابق</Link> : null}
        {page < pages ? <Link className="ds-btn" href={href(page + 1)}>التالي</Link> : null}
      </span>
    </div>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  await requireAnyPermission(["customers"]);
  const { id } = await params;
  const sp = await searchParams;
  const op = clampPage(sp.op);
  const pp = clampPage(sp.pp);
  const sb = await createClient();

  const [cr, sr, ordR, prR, dr, ir] = await Promise.all([
    sb.from("customers").select("id,user_id,full_name,phone,area,address,created_at").eq("id", id).maybeSingle(),
    sb.rpc("admin_customer_summary", { p_customer_id: id }),
    sb
      .from("orders")
      .select("id,order_number,total,status,payment_status,created_at", { count: "exact" })
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .range((op - 1) * PAGE, op * PAGE - 1),
    sb.rpc("admin_customer_purchases", { p_customer_id: id, p_limit: PAGE, p_offset: (pp - 1) * PAGE }),
    sb
      .from("store_debts")
      .select("id,direction,reason,original_amount,paid_amount,remaining_amount,due_date,status,order_id")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("installments")
      .select("id,title,direction,total_amount,paid_amount,remaining_amount,status,start_date,order_id")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (cr.error || !cr.data) notFound();

  const c = cr.data as Customer;
  const sum = (sr.data ?? null) as Summary | null;
  const orders = (ordR.data ?? []) as OrderRow[];
  const ordersTotal = ordR.count ?? orders.length;
  const purch = (prR.data ?? null) as { total: number; rows: PurchaseRow[] } | null;
  const purchRows = purch?.rows ?? [];
  const purchTotal = Number(purch?.total ?? 0);
  const debts = (dr.data ?? []) as D[];
  const insts = (ir.data ?? []) as I[];

  const isOwner = (await getRole()) === "owner";
  const logIds = [
    id,
    ...orders.map((o) => o.id),
    ...debts.slice(0, 20).map((d) => d.id),
    ...insts.slice(0, 20).map((i) => i.id),
  ];
  const [fr, lr, nr] = await Promise.all([
    c.user_id
      ? sb
          .from("favorites")
          .select("id,product_id,created_at")
          .eq("user_id", c.user_id)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as Fav[], error: null }),
    isOwner
      ? sb
          .from("activity_logs")
          .select("id,action,entity_type,created_at")
          .in("entity_id", logIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as Log[], error: null }),
    sb
      .from("customer_notes")
      .select("id,body,created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const favs = (fr.data ?? []) as Fav[];
  const logs = (lr.data ?? []) as Log[];
  const notes = (nr.data ?? []) as Note[];

  const perms = (await getMyPermissions()) as string[];
  const canFinance = isOwner || perms.includes("store_debts");
  const canChats = isOwner || perms.includes("chats");
  type ChatRow = {
    id: string;
    kind: string | null;
    order_id: string | null;
    product_id: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    admin_unread_count: number | null;
  };
  const chR = canChats
    ? await sb
        .from("chats")
        .select("id,kind,order_id,product_id,last_message_at,last_message_preview,admin_unread_count")
        .eq("customer_id", id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(10)
    : { data: [] as ChatRow[], error: null };
  const chats = (chR.data ?? []) as ChatRow[];
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

  const prodName = new Map<string, string>();
  if (favs.length) {
    const prodR = await sb.from("products").select("*").in("id", favs.map((f) => f.product_id));
    for (const p of (prodR.data ?? []) as Record<string, unknown>[]) {
      prodName.set(String(p.id), String(p.name ?? p.title ?? p.name_ar ?? "منتج"));
    }
  }

  const link = (tab: string, o: number, p: number) => {
    const u = new URLSearchParams({ tab });
    if (o > 1) u.set("op", String(o));
    if (p > 1) u.set("pp", String(p));
    return `/admin/customers/${id}?${u.toString()}`;
  };

  const firstAt =
    sum?.first_order_at && new Date(sum.first_order_at).getTime() < new Date(c.created_at).getTime()
      ? sum.first_order_at
      : c.created_at;

  const orderHints: string[] = [];
  if (sum && sum.orders_cancelled > 0) orderHints.push(`ملغاة: ${fmtNum(sum.orders_cancelled)}`);
  if (sum && sum.orders_returned > 0)
    orderHints.push(`مرتجعة: ${fmtNum(sum.orders_returned)} (${fmtIQD(sum.returned_total)})`);

  const owedDebts = debts.filter((d) => d.direction === "receivable" && d.status !== "cancelled");
  const owedInsts = insts.filter((x) => x.direction === "receivable" && x.status !== "cancelled");
  const debtByOrder = new Map(debts.filter((d) => d.order_id).map((d) => [d.order_id as string, d]));
  const tabs = [
    {
      key: "overview",
      label: "نظرة عامة",
      content: (
        <div style={{ display: "grid", gap: 14 }}>
          {sr.error || !sum ? (
            <Panel><Empty>تعذر تحميل ملخص العميل. هذا لا يعني عدم وجود طلبات.</Empty></Panel>
          ) : (
            <KpiGrid
              items={[
                { label: "الطلبات", value: fmtNum(sum.orders_live), hint: orderHints.join(" · ") || undefined },
                { label: "قيمة المشتريات", value: fmtIQD(sum.purchases_total), hint: "طلبات مسلّمة فقط" },
                {
                  label: "متوسط الطلب المسلّم",
                  value: sum.delivered_count > 0 ? fmtIQD(Math.round(sum.purchases_total / sum.delivered_count)) : "-",
                },
                { label: "أول تعامل موثق", value: fmtDate(firstAt) },
                { label: "آخر طلب", value: sum.last_order_at ? fmtDate(sum.last_order_at) : "-" },
                ...(canFinance
                  ? [
                      { label: "المسدد من الديون والأقساط", value: fmtIQD(owedDebts.reduce((a, d) => a + Number(d.paid_amount), 0) + owedInsts.reduce((a, x) => a + Number(x.paid_amount), 0)) },
                      { label: "المتبقي على العميل", value: fmtIQD(owedDebts.reduce((a, d) => a + Number(d.remaining_amount), 0) + owedInsts.reduce((a, x) => a + Number(x.remaining_amount), 0)) },
                      { label: "عدد الديون", value: fmtNum(debts.length) },
                      { label: "عدد الأقساط", value: fmtNum(insts.length) },
                    ]
                  : []),
              ]}
            />
          )}
          <Panel title="بيانات العميل">
            <div style={{ display: "grid", gap: 10 }}>
              <div><span className="ds-kpi-label">الهاتف: </span><span dir="ltr">{c.phone ?? "-"}</span></div>
              <div><span className="ds-kpi-label">المنطقة: </span>{c.area ?? "-"}</div>
              <div><span className="ds-kpi-label">العنوان: </span>{c.address ?? "-"}</div>
              <div><span className="ds-kpi-label">نوع السجل: </span>{c.user_id ? "حساب في المتجر" : "بدون حساب"}</div>
            </div>
          </Panel>
        </div>
      ),
    },
    {
      key: "orders",
      label: "الطلبات والمشتريات",
      count: sum ? sum.orders_live : ordersTotal,
      content: (
        <div style={{ display: "grid", gap: 14 }}>
          <Panel title="طلبات العميل">
            {ordR.error ? (
              <Empty>تعذر تحميل الطلبات.</Empty>
            ) : orders.length === 0 ? (
              <Empty>لا توجد طلبات لهذا العميل.</Empty>
            ) : (
              <>
                <table className="ds-table">
                  <thead>
                    <tr><th>رقم الطلب</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th><th>الدفع</th><th>الدين</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td data-label="رقم الطلب">
                          <Link href={`/admin/orders/${o.id}`}>{o.order_number ?? o.id.slice(0, 8)}</Link>
                        </td>
                        <td data-label="التاريخ">{fmtDate(o.created_at)}</td>
                        <td data-label="الإجمالي">{fmtIQD(o.total)}</td>
                        <td data-label="الحالة"><Badge>{o.status}</Badge></td>
                        <td data-label="الدفع"><Badge>{o.payment_status ?? "-"}</Badge></td>
                        <td data-label="الدين">{canFinance && debtByOrder.get(o.id) ? `${fmtIQD(Number(debtByOrder.get(o.id)?.paid_amount ?? 0))} / ${fmtIQD(Number(debtByOrder.get(o.id)?.remaining_amount ?? 0))}` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pager total={ordersTotal} page={op} href={(n) => link("orders", n, pp)} />
              </>
            )}
          </Panel>
          <Panel title="المواد التي اشتراها">
            {prR.error ? (
              <Empty>تعذر تحميل المشتريات.</Empty>
            ) : purchRows.length === 0 ? (
              <Empty>لا توجد مشتريات مسلّمة.</Empty>
            ) : (
              <>
                <table className="ds-table">
                  <thead>
                    <tr><th>المنتج</th><th>الكمية</th><th>السعر وقت الطلب</th><th>تاريخ الطلب</th><th>الطلب</th></tr>
                  </thead>
                  <tbody>
                    {purchRows.map((p, i) => (
                      <tr key={`${p.order_id}-${i}`}>
                        <td data-label="المنتج">
                          {p.product_name ?? "-"}
                          {p.variant_label ? <small className="qa-muted"> · {p.variant_label}</small> : null}
                        </td>
                        <td data-label="الكمية">{fmtNum(p.quantity)}</td>
                        <td data-label="السعر وقت الطلب">{fmtIQD(p.unit_price)}</td>
                        <td data-label="تاريخ الطلب">{fmtDate(p.ordered_at)}</td>
                        <td data-label="الطلب">
                          <Link href={`/admin/orders/${p.order_id}`}>{p.order_number ?? p.order_id.slice(0, 8)}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pager total={purchTotal} page={pp} href={(n) => link("orders", op, n)} />
                <p className="ds-desc">
                  تُحتسب الطلبات المسلّمة فقط دون الملغاة أو المرتجعة، وتُعرض بيانات العنصر المحفوظة وقت الطلب.
                </p>
              </>
            )}
          </Panel>
        </div>
      ),
    },
    {
      key: "account",
      label: "الحساب والتسديدات",
      count: debts.length + insts.length,
      content: canFinance ? (
        <AccountPanel
          customerId={id}
          debts={debts}
          insts={insts}
          from={isDate(sp.sf)}
          to={isDate(sp.st)}
        />
      ) : (
        <Panel title="الحساب والتسديدات">
          <Empty>لا تملك صلاحية عرض الحسابات المالية للعملاء (ديون المتجر).</Empty>
        </Panel>
      ),
    },
    {
      key: "comms",
      label: "التواصل والملاحظات",
      count: notes.length,
      content: (
        <div style={{ display: "grid", gap: 14 }}>
          {canChats ? (
            <Panel title="محادثات المتجر">
              {chR.error ? (
                <Empty>تعذر تحميل المحادثات.</Empty>
              ) : chats.length === 0 ? (
                <Empty>لا توجد محادثات مع هذا العميل.</Empty>
              ) : (
                <table className="ds-table">
                  <thead>
                    <tr><th>المحادثة</th><th>آخر رسالة</th><th>غير مقروء</th><th></th></tr>
                  </thead>
                  <tbody>
                    {chats.map((ch) => (
                      <tr key={ch.id}>
                        <td data-label="المحادثة">{ch.order_id ? "عن طلب" : ch.product_id ? "عن منتج" : "عامة"}</td>
                        <td data-label="آخر رسالة">
                          {ch.last_message_at ? fmtDate(ch.last_message_at) : "-"}
                          {ch.last_message_preview ? <small className="qa-muted"> · {ch.last_message_preview}</small> : null}
                        </td>
                        <td data-label="غير مقروء">{fmtNum(ch.admin_unread_count ?? 0)}</td>
                        <td><Link className="ds-btn" href={`/admin/chats?chat=${ch.id}`}>فتح</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          ) : null}
          <Panel title="ملاحظات الإدارة">
            <NoteForm customerId={id} />
            {nr.error ? (
              <Empty>تعذر تحميل الملاحظات.</Empty>
            ) : notes.length === 0 ? (
              <Empty>لا توجد ملاحظات.</Empty>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {notes.map((n) => (
                  <div key={n.id} className="qa-card">
                    <div className="qa-row">
                      <small className="qa-muted">{fmtDate(n.created_at)}</small>
                      <DeleteNote id={n.id} customerId={id} />
                    </div>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="المفضلة">
            {!c.user_id ? (
              <Empty>لا توجد مفضلة: هذا العميل بدون حساب.</Empty>
            ) : fr.error ? (
              <Empty>تعذر تحميل المفضلة.</Empty>
            ) : favs.length === 0 ? (
              <Empty>لا توجد منتجات مفضلة.</Empty>
            ) : (
              <table className="ds-table">
                <thead><tr><th>المنتج</th><th>تاريخ الإضافة</th></tr></thead>
                <tbody>
                  {favs.map((f) => (
                    <tr key={f.id}>
                      <td data-label="المنتج">{prodName.get(f.product_id) ?? "منتج"}</td>
                      <td data-label="تاريخ الإضافة">{fmtDate(f.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          {isOwner ? (
            <Panel title="سجل النشاط">
              {lr.error ? (
                <Empty>تعذر تحميل سجل النشاط.</Empty>
              ) : logs.length === 0 ? (
                <Empty>لا يوجد نشاط مسجل.</Empty>
              ) : (
                <table className="ds-table">
                  <thead><tr><th>الإجراء</th><th>النوع</th><th>التاريخ</th></tr></thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td data-label="الإجراء">{l.action}</td>
                        <td data-label="النوع">{l.entity_type ?? "-"}</td>
                        <td data-label="التاريخ">{fmtDate(l.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section>
      <PageHead
        title={c.full_name ?? "عميل بدون اسم"}
        desc={`${c.user_id ? "حساب في المتجر" : "بدون حساب"} · أول تعامل موثق ${fmtDate(firstAt)}`}
        actions={
          <span style={{ display: "inline-flex", gap: 8 }}>
            {c.phone ? (
              <a className="ds-btn" href={`tel:${c.phone}`}><Phone size={16} /> اتصال</a>
            ) : null}
            {chats[0] ? (
              <Link className="ds-btn" href={`/admin/chats?chat=${chats[0].id}`}>فتح المحادثة</Link>
            ) : null}
            <Link className="ds-btn" href="/admin/customers">كل العملاء</Link>
          </span>
        }
      />
      <CustomerTabs tabs={tabs} initial={sp.tab} />
    </section>
  );
}
