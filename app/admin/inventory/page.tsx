import Link from "next/link";
import { ArrowRight, Plus, Tag, X } from "lucide-react";
import { getMyPermissions, requireAnyPermission } from "../../../lib/admin/access";
import { fmtNum } from "../../../lib/admin/fmt";
import { CATEGORY_BUCKET, getAdjustTarget, getDetail, getList, getOverview, type Filters } from "../../../lib/admin/inventory";
import { publicImageUrl } from "../../../lib/shop/images";
import { PageHead, Panel, Empty } from "../_components/ui";
import { AdjustForm } from "./_components/AdjustForm";
import { ProductPanel } from "./_components/ProductPanel";
import { CategoryGrid, ProductGrid, type Tile } from "./_components/Cards";
import st from "./inventory.module.css";

type SP = { q?: string; c?: string; v?: string; s?: string; o?: string; pg?: string; p?: string; open?: string };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["products", "inventory"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[%,()]/g, "").trim().slice(0, 60);
  const c = sp.c === "all" || sp.c === "none" || (sp.c && UUID.test(sp.c)) ? sp.c : "";
  const v = sp.v === "shown" || sp.v === "hidden" ? sp.v : "";
  const s = sp.s === "ok" || sp.s === "low" || sp.s === "out" ? sp.s : "";
  const sortBy = ["name", "qty", "price_asc", "price_desc"].includes(sp.o ?? "") ? (sp.o as string) : "new";
  const pg = Math.max(1, parseInt(sp.pg ?? "1", 10) || 1);
  const f: Filters = { q, c: c ?? "", v, s, o: sortBy, pg };

  const mk = (over: Record<string, string | number | null>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (c) u.set("c", c);
    if (v) u.set("v", v);
    if (s) u.set("s", s);
    if (sortBy !== "new") u.set("o", sortBy);
    for (const [k, val] of Object.entries(over)) {
      if (val === null || val === "") u.delete(k); else u.set(k, String(val));
    }
    const qs = u.toString();
    return "/admin/inventory" + (qs ? "?" + qs : "");
  };

  const ov = await getOverview();
  if (!ov) {
    return (
      <section className={st.page}>
        <PageHead title="المخزون" desc="منتجاتك وتصنيفاتها وكمياتها في مكان واحد" />
        <Panel><Empty>تعذّر تحميل المخزون. <Link className="ds-btn" href="/admin/inventory">إعادة المحاولة</Link></Empty></Panel>
      </section>
    );
  }
  const t = ov.totals;
  const catName = new Map(ov.cats.map((x) => [x.id, x.name]));
  const showProducts = !!(c || q || v || s);

  let list: Awaited<ReturnType<typeof getList>> | null = null;
  let failed = false;
  if (showProducts) {
    try { list = await getList(f, ov.slim); } catch { failed = true; }
  }
  const target = sp.p && UUID.test(sp.p) ? await getAdjustTarget(sp.p) : null;

  const openId = sp.open && UUID.test(sp.open) ? sp.open : "";
  const detail = openId ? await getDetail(openId, catName) : null;

  const perms = await getMyPermissions();
  const canProducts = perms.length === 0 || perms.includes("products");
  const create = canProducts ? <Link href="/admin/products/new" className="ds-btn ds-btn-gold"><Plus size={16} /> إنشاء منتج</Link> : null;
  const headActions = canProducts ? (
    <>
      <Link href="/admin/inventory/categories" className="ds-btn"><Tag size={16} /> إدارة التصنيفات</Link>
      {create}
    </>
  ) : null;

  const kpis = [
    { label: "إجمالي المنتجات", value: t.all, hint: "المنتجات الأساسية دون عدد الخيارات", href: "/admin/inventory?c=all", on: c === "all" && !v && !s },
    { label: "منخفضة المخزون", value: t.low, hint: "الكمية ضمن حد التنبيه", href: "/admin/inventory?s=low", on: s === "low" },
    { label: "نافدة", value: t.out, hint: "الكمية صفر", href: "/admin/inventory?s=out", on: s === "out" },
    { label: "غير نشطة", value: t.hidden, hint: "حالة ظهور، وقد تكون نافدة أيضاً", href: "/admin/inventory?v=hidden", on: v === "hidden" },
    { label: "نشطة", value: t.all - t.hidden, hint: "المنتجات الظاهرة في المتجر", href: "/admin/inventory?v=shown", on: v === "shown" },
  ];

  const tiles: Tile[] = [
    { key: "all", href: "/admin/inventory?c=all", name: "جميع المنتجات", counts: { total: t.all, low: t.low, out: t.out }, icon: "all", image: null },
  ];
  for (const k of ov.cats) {
    tiles.push({
      key: k.id, href: `/admin/inventory?c=${k.id}`, name: k.name, icon: "cat",
      counts: ov.perCat[k.id] ?? { total: 0, low: 0, out: 0 },
      image: CATEGORY_BUCKET && k.image_path ? publicImageUrl(CATEGORY_BUCKET, k.image_path) : null,
      hidden: !k.is_active,
    });
  }
  if (ov.perCat.none?.total) {
    tiles.push({ key: "none", href: "/admin/inventory?c=none", name: "غير مصنف", counts: ov.perCat.none, icon: "none", image: null });
  }

  const title = c === "none" ? "غير مصنف" : c && c !== "all" ? (catName.get(c) ?? "التصنيف") : q ? "نتائج البحث" : "جميع المنتجات";
  const chips: { label: string; href: string }[] = [];
  if (q) chips.push({ label: `بحث: ${q}`, href: mk({ q: null, pg: null }) });
  if (v) chips.push({ label: v === "hidden" ? "غير نشط" : "منشور", href: mk({ v: null, pg: null }) });
  if (s) chips.push({ label: s === "low" ? "منخفض" : s === "out" ? "نافد" : "متوفر", href: mk({ s: null, pg: null }) });
  const filtered = !!(q || v || s);

  return (
    <section className={st.page}>
      <PageHead title="المخزون" desc="منتجاتك وتصنيفاتها وكمياتها في مكان واحد" actions={headActions} />

      <div className={st.kpis}>
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={`${st.kpi} ${k.on ? st.kpiOn : ""}`}>
            <span className={st.kpiLabel}>{k.label}</span>
            <span className={st.kpiValue}>{fmtNum(k.value)}</span>
            <span className={st.kpiHint}>{k.hint}</span>
          </Link>
        ))}
      </div>

      <form method="get" action="/admin/inventory" className={st.bar}>
        <input className={`ds-input ${st.search}`} type="search" name="q" defaultValue={q}
          placeholder="ابحث بالاسم أو الماركة أو الباركود أو رمز الخيار" aria-label="بحث" />
        <select className={`ds-select ${st.field}`} name="c" defaultValue={c === "all" ? "" : c} aria-label="التصنيف">
          <option value="">جميع التصنيفات</option>
          <option value="none">غير مصنف</option>
          {ov.cats.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <select className={`ds-select ${st.field}`} name="v" defaultValue={v} aria-label="الظهور">
          <option value="">كل حالات الظهور</option>
          <option value="shown">منشور</option>
          <option value="hidden">مخفي</option>
        </select>
        <select className={`ds-select ${st.field}`} name="s" defaultValue={s} aria-label="المخزون">
          <option value="">كل حالات المخزون</option>
          <option value="ok">متوفر</option>
          <option value="low">منخفض</option>
          <option value="out">نافد</option>
        </select>
        <select className={`ds-select ${st.field}`} name="o" defaultValue={sortBy} aria-label="الترتيب">
          <option value="new">الأحدث</option>
          <option value="name">الاسم</option>
          <option value="qty">الأقل كمية</option>
          <option value="price_asc">السعر تصاعدياً</option>
          <option value="price_desc">السعر تنازلياً</option>
        </select>
        <button type="submit" className="ds-btn ds-btn-gold">بحث</button>
      </form>

      {target ? (
        <Panel title={`تعديل الكمية: ${target.name}`} action={<Link className="ds-btn" href={mk({})}>إغلاق</Link>}>
          <AdjustForm products={[target]} selected={target.id} />
        </Panel>
      ) : null}

      {t.all === 0 ? (
        <Panel><Empty>لم تُضف منتجات بعد. {create}</Empty></Panel>
      ) : !showProducts ? (
        <CategoryGrid tiles={tiles} />
      ) : failed || !list ? (
        <Panel><Empty>تعذّر تحميل المنتجات. <Link className="ds-btn" href={mk({})}>إعادة المحاولة</Link></Empty></Panel>
      ) : (
        <>
          <div className={st.crumb}>
            <Link href="/admin/inventory" className="ds-btn"><ArrowRight size={16} /> التصنيفات</Link>
            <h2>{title}</h2>
            <span className={st.muted}>{fmtNum(list.total)} منتج</span>
          </div>
          {chips.length ? (
            <div className={st.chips}>
              {chips.map((x) => (
                <Link key={x.label} href={x.href} className={st.chip}>{x.label} <X size={14} /></Link>
              ))}
              <Link href={mk({ q: null, v: null, s: null, pg: null })} className="ds-btn">مسح الفلاتر</Link>
            </div>
          ) : null}
          {c && c !== "all" && q ? (
            <div className={st.muted}>البحث داخل هذا التصنيف فقط. <Link href={mk({ c: "all", pg: null })} className="ds-btn">توسيع البحث لجميع المنتجات</Link></div>
          ) : null}
          {list.items.length === 0 ? (
            <Panel>
              <Empty>
                {filtered ? "لا توجد نتائج مطابقة للبحث أو الفلاتر. " : "لا توجد منتجات في هذا التصنيف. "}
                {filtered ? <Link className="ds-btn" href={mk({ q: null, v: null, s: null, pg: null })}>مسح الفلاتر</Link> : create}
              </Empty>
            </Panel>
          ) : (
            <ProductGrid items={list.items} adjustHref={(id) => mk({ p: id })} openHref={(id) => mk({ open: id })} />
          )}
          {list.pages > 1 ? (
            <div className={st.pager}>
              {pg > 1 ? <Link className="ds-btn" href={mk({ pg: pg - 1 })}>السابق</Link> : <span className={`ds-btn ${st.off}`}>السابق</span>}
              <span className={st.muted}>صفحة {fmtNum(pg)} من {fmtNum(list.pages)}</span>
              {pg < list.pages ? <Link className="ds-btn" href={mk({ pg: pg + 1 })}>التالي</Link> : <span className={`ds-btn ${st.off}`}>التالي</span>}
            </div>
          ) : null}
        </>
      )}
      {detail ? <ProductPanel d={detail} closeHref={mk({})} adjustHref={mk({ p: detail.product.id })} /> : null}
    </section>
  );
}
