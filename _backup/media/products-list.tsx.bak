import Link from "next/link";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { fmtIQD, fmtNum } from "../../../lib/admin/fmt";
import { PageHead, KpiGrid, Panel, Badge, Empty } from "../_components/ui";
import { ProductDrawer, type DrawerData } from "./_components/ProductDrawer";
import { publicImageUrl } from "../../../lib/shop/images";

type Tone = "good" | "warn" | "bad" | "info";
type Row = {
  id: string; category_id: string | null; name: string; brand: string | null;
  price: number; quantity: number; low_stock_threshold: number;
  status: string; barcode: string | null; is_featured: boolean;
};
type Slim = { quantity: number; low_stock_threshold: number; status: string };

const isOut = (p: Slim) => p.quantity <= 0;
const isLow = (p: Slim) => p.quantity > 0 && p.quantity <= p.low_stock_threshold;

function StockBadge({ p }: { p: Slim }) {
  if (isOut(p)) return <Badge tone="bad">نافد</Badge>;
  if (isLow(p)) return <Badge tone="warn">منخفض</Badge>;
  return <Badge tone="good">متوفر</Badge>;
}

function StatusBadge({ s }: { s: string }) {
  if (s === "active") return <Badge tone="good">نشط</Badge>;
  if (s === "hidden") return <Badge>مخفي</Badge>;
  return <Badge tone={"info" as Tone}>{s}</Badge>;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string; c?: string; open?: string }>;
}) {
  await requireAnyPermission(["products"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[%,()]/g, "").trim();
  const sb = await createClient();

  const [allR, catR] = await Promise.all([
    sb.from("products").select("quantity,low_stock_threshold,status").range(0, 4999),
    sb.from("categories").select("id,name").order("sort_order"),
  ]);

  let qb = sb
    .from("products")
    .select("id,category_id,name,brand,price,quantity,low_stock_threshold,status,barcode,is_featured")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.c) qb = qb.eq("category_id", sp.c);
  if (q) qb = qb.or(`name.ilike.%${q}%,barcode.ilike.%${q}%`);
  if (sp.s === "active" || sp.s === "hidden") qb = qb.eq("status", sp.s);
  const listR = await qb;

  if (allR.error || listR.error) {
    return (
      <section>
        <PageHead title="المنتجات" />
        <Panel><Empty>تعذّر تحميل المنتجات. حدّث الصفحة وحاول مجدداً.</Empty></Panel>
      </section>
    );
  }

  const all = (allR.data ?? []) as Slim[];
  const cats = (catR.data ?? []) as { id: string; name: string }[];
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  let rows = (listR.data ?? []) as Row[];
  if (sp.s === "low") rows = rows.filter(isLow);
  if (sp.s === "out") rows = rows.filter(isOut);

  const imgR = await sb
    .from("product_images")
    .select("product_id,storage_path")
    .eq("is_primary", true)
    .in("product_id", rows.map((r) => r.id));
  const thumb = new Map<string, string | null>(
    ((imgR.data ?? []) as { product_id: string; storage_path: string }[]).map(
      (i) => [i.product_id, publicImageUrl("product-images", i.storage_path)],
    ),
  );

  const hrefFor = (open?: string) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.s) u.set("s", sp.s);
    if (sp.c) u.set("c", sp.c);
    if (open) u.set("open", open);
    const qs = u.toString();
    return "/admin/products" + (qs ? "?" + qs : "");
  };

  let detail: DrawerData | null = null;
  if (sp.open && /^[0-9a-f-]{36}$/i.test(sp.open)) {
    const oid = sp.open;
    const [dp, dc, di, dv, dm, dl] = await Promise.all([
      sb.from("products").select("id,name,brand,description,price,compare_at_price,quantity,low_stock_threshold,status,is_featured,is_new,barcode,qr_code,category_id,created_at,updated_at").eq("id", oid).maybeSingle(),
      sb.from("product_costs").select("cost_price").eq("product_id", oid).maybeSingle(),
      sb.from("product_images").select("id,storage_path,is_primary").eq("product_id", oid).order("sort_order"),
      sb.from("product_variants").select("id,sku,barcode,price_adjustment,quantity,track_quantity,is_active").eq("product_id", oid).order("created_at"),
      sb.from("inventory_movements").select("id,movement_type,quantity_before,change,quantity_after,reason,created_at").eq("product_id", oid).order("created_at", { ascending: false }).limit(20),
      sb.from("activity_logs").select("id,action,created_at").in("entity_type", ["product", "products"]).eq("entity_id", oid).order("created_at", { ascending: false }).limit(20),
    ]);
    if (dp.data) {
      const pd = dp.data as unknown as DrawerData["product"] & { category_id: string | null };
      detail = {
        product: { ...pd, category: pd.category_id ? catName.get(pd.category_id) ?? null : null },
        cost: (dc.data as { cost_price: number } | null)?.cost_price ?? null,
        images: ((di.data ?? []) as { id: string; storage_path: string; is_primary: boolean }[]).map((i) => ({
          id: i.id,
          url: publicImageUrl("product-images", i.storage_path),
          primary: i.is_primary,
        })),
        variants: (dv.data ?? []) as unknown as DrawerData["variants"],
        movements: (dm.data ?? []) as unknown as DrawerData["movements"],
        logs: (dl.data ?? []) as unknown as DrawerData["logs"],
      };
    }
  }

  const total = all.length;
  const active = all.filter((p) => p.status === "active").length;
  const low = all.filter(isLow).length;
  const out = all.filter(isOut).length;

  return (
    <section>
      <PageHead title="المنتجات" desc="نظرة شاملة على المنتجات والمخزون والتصنيفات." actions={<Link className="ds-btn ds-btn-gold" href="/admin/products/new">+ إضافة منتج</Link>} />
      <KpiGrid
        items={[
          { label: "إجمالي المنتجات", value: fmtNum(total) },
          { label: "منتجات نشطة", value: fmtNum(active), tone: "good" },
          { label: "مخزون منخفض", value: fmtNum(low), tone: low ? "warn" : undefined, hint: "تحت حد التنبيه" },
          { label: "نافدة", value: fmtNum(out), tone: out ? "bad" : undefined },
        ]}
      />
      <Panel title="قائمة المنتجات">
        <form method="get" className="ds-filters">
          <input className="ds-input" style={{ flex: "2 1 200px" }} name="q" defaultValue={sp.q ?? ""} placeholder="بحث بالاسم أو الباركود" />
          <select className="ds-select" style={{ flex: "1 1 140px" }} name="s" defaultValue={sp.s ?? ""}>
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="hidden">مخفي</option>
            <option value="low">مخزون منخفض</option>
            <option value="out">نافد</option>
          </select>
          <select className="ds-select" style={{ flex: "1 1 140px" }} name="c" defaultValue={sp.c ?? ""}>
            <option value="">كل التصنيفات</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="ds-btn ds-btn-gold" type="submit">تطبيق</button>
        </form>
        {rows.length === 0 ? (
          <Empty>{total === 0 ? "لا توجد منتجات بعد." : "لا توجد منتجات مطابقة للفلاتر."}</Empty>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>المنتج</th><th>التصنيف</th><th>السعر</th><th>الكمية</th><th>المخزون</th><th>الحالة</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td data-label="المنتج">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {thumb.get(p.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.get(p.id)!} alt="" width={44} height={44} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(128,128,128,.18)", flexShrink: 0 }} />
              )}
              <Link href={hrefFor(p.id)} scroll={false} style={{ fontWeight: 700, color: "inherit", textDecoration: "none" }}>{p.name}</Link>
            </div>
                    {p.brand ? <div className="ds-kpi-hint">{p.brand}</div> : null}
                  </td>
                  <td data-label="التصنيف">{p.category_id ? catName.get(p.category_id) ?? "-" : "-"}</td>
                  <td data-label="السعر">{fmtIQD(p.price)}</td>
                  <td data-label="الكمية">{fmtNum(p.quantity)}</td>
                  <td data-label="المخزون"><StockBadge p={p} /></td>
                  <td data-label="الحالة"><StatusBadge s={p.status} /></td>
                  <td><Link className="ds-btn" href={`/admin/products/${p.id}`}>تعديل</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length === 200 ? <p className="ds-desc">يعرض أحدث 200 منتج. استخدم البحث لتضييق النتائج.</p> : null}
      </Panel>
    {detail ? <ProductDrawer data={detail} closeHref={hrefFor()} editHref={`/admin/products/${detail.product.id}`} /> : null}
      </section>
  );
}
