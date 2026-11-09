import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { createClient } from "../../../../lib/supabase/server";
import { fmtIQD, fmtNum } from "../../../../lib/admin/fmt";
import { PageHead, Panel, Badge, Empty } from "../../_components/ui";
import { ProductForm, type ProductInit } from "../_components/ProductForm";
import { VisibilityButton } from "../_components/VisibilityButton";
import { VariantForm, type VariantInit } from "../_components/MediaForms";
import { ImageUploader } from "../_components/ImageUploader";
import { OptionsManager } from "../_components/OptionsManager";
import { Product360Manager } from "../_components/Product360Manager";
import { setPrimaryImage, deleteImage, toggleVariant, moveImage } from "../media-actions";

type Img = { id: string; storage_path: string; is_primary: boolean };

export default async function Page({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string; partial?: string; done?: string }>;
}) {
  await requireAnyPermission(["products"]);
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const [pr, cr, cat, im, vr] = await Promise.all([
    sb.from("products")
      .select("id,slug,name,category_id,brand,description,barcode,price,compare_at_price,quantity,low_stock_threshold,status,is_featured,is_new")
      .eq("id", id)
      .maybeSingle(),
    sb.from("product_costs").select("cost_price").eq("product_id", id).maybeSingle(),
    sb.from("categories").select("id,name").order("sort_order"),
    sb.from("product_images").select("id,storage_path,is_primary").eq("product_id", id).order("sort_order"),
    sb.from("product_variants")
      .select("id,sku,barcode,price_adjustment,quantity,track_quantity,is_active")
      .eq("product_id", id)
      .order("created_at"),
  ]);
  if (pr.error || !pr.data) notFound();

  const r360 = await sb.from("product_360_images").select("id,storage_path").eq("product_id", id).order("sort_order");
  const imgs = (im.data ?? []) as Img[];
  const vars = (vr.data ?? []) as VariantInit[];
  type OptRow = { id: string; name: string; kind: string; sort_order: number; product_option_values: { id: string; value: string; sort_order: number }[] | null };
  const vIds = vars.map((x) => x.id);
  const optRes = await sb
    .from("product_options")
    .select("id,name,kind,sort_order,product_option_values(id,value,sort_order)")
    .eq("product_id", id)
    .order("sort_order");
  const linkRes = vIds.length
    ? await sb.from("variant_option_values").select("variant_id,option_value_id").in("variant_id", vIds)
    : { data: [] as { variant_id: string; option_value_id: string }[], error: null };
  const links = (linkRes.data ?? []) as unknown as { variant_id: string; option_value_id: string }[];
  const linked = new Set(links.map((l) => l.variant_id));
  const usedValues = new Set(links.map((l) => l.option_value_id));
  const opts = (optRes.data ?? []) as unknown as OptRow[];
  const adjMax = Math.max(0, ...vars.filter((x) => x.is_active && linked.has(x.id)).map((x) => Number(x.price_adjustment) || 0));
  const editing = sp.v ? vars.find((x) => x.id === sp.v) : undefined;
  const urlOf = (p: string) => sb.storage.from("product-images").getPublicUrl(p).data.publicUrl;

  return (
    <section>
      <PageHead
        title="تعديل المنتج"
        desc={pr.data.name}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            {pr.data.status === "hidden" ? <Badge tone="warn">مخفي (مسودة)</Badge>
              : pr.data.status === "sold_out" ? <Badge tone="info">نفدت الكمية (ظاهر)</Badge>
              : <Badge tone="good">ظاهر للزبائن</Badge>}
            <VisibilityButton id={id} status={pr.data.status} />
            {pr.data.status !== "hidden" ? <Link className="ds-btn" href={`/product/${pr.data.slug}`}>عرض في المتجر</Link> : null}
            <Link className="ds-btn" href="/admin/products">رجوع للمنتجات</Link>
          </div>
        }
      />
      {sp.done ? (
        <Panel>
          <p role="status" style={{ fontWeight: 600 }}>
            {({
              published: "تم نشر المنتج وهو ظاهر للزبائن.",
              draft: "تم حفظ المنتج كمسودة (غير ظاهر للزبائن).",
              partial: "حُفظ المنتج لكن لم تكتمل الكمية أو التكلفة. راجعهما واحفظ مرة أخرى.",
              publish_failed: "حُفظ المنتج كمسودة لكن تعذّر نشره. تحقق من التصنيف والسعر والصور ثم اضغط «نشر المنتج».",
            } as Record<string, string>)[sp.done] ?? ""}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {pr.data.status !== "hidden" ? <Link className="ds-btn" href={`/product/${pr.data.slug}`}>عرض في المتجر</Link> : null}
            <Link className="ds-btn" href="/admin/inventory">العودة إلى المخزون</Link>
            <Link className="ds-btn" href="/admin/products/new">إنشاء منتج آخر</Link>
          </div>
        </Panel>
      ) : null}
      {sp.partial ? (
        <Panel>
          <p role="alert" style={{ color: "var(--c-warn, #B45309)", fontWeight: 600 }}>
            حُفظ المنتج لكن لم تكتمل الكمية أو التكلفة. راجعهما أدناه واحفظ مرة أخرى.
          </p>
        </Panel>
      ) : null}
      <ProductForm
        categories={cat.data ?? []}
        product={pr.data as ProductInit}
        cost={cr.data?.cost_price ?? null}
        adjMax={adjMax}
        primaryUrl={imgs.length ? urlOf((imgs.find((m) => m.is_primary) ?? imgs[0]).storage_path) : null}
      />

      <Panel title="صور المنتج">
        {im.error ? (
          <Empty>تعذّر تحميل الصور.</Empty>
        ) : imgs.length === 0 ? (
          <Empty>لا توجد صور. الصورة الأولى التي ترفعها تصبح الرئيسية.</Empty>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
            {imgs.map((m) => (
              <div key={m.id} style={{ border: "1px solid #ECE6DA", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                <img src={urlOf(m.storage_path)} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                <div style={{ padding: 8, display: "grid", gap: 6 }}>
                  {m.is_primary ? (
                    <Badge tone="good">الرئيسية</Badge>
                  ) : (
                    <form action={setPrimaryImage}>
                      <input type="hidden" name="product_id" value={id} />
                      <input type="hidden" name="id" value={m.id} />
                      <button className="ds-btn" style={{ width: "100%", height: 34 }} type="submit">جعلها رئيسية</button>
                    </form>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <form action={moveImage} style={{ flex: 1 }}>
                      <input type="hidden" name="product_id" value={id} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="dir" value="-1" />
                      <button className="ds-btn" style={{ width: "100%", height: 34 }} type="submit">تقديم</button>
                    </form>
                    <form action={moveImage} style={{ flex: 1 }}>
                      <input type="hidden" name="product_id" value={id} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="dir" value="1" />
                      <button className="ds-btn" style={{ width: "100%", height: 34 }} type="submit">تأخير</button>
                    </form>
                  </div>
                  <form action={deleteImage}>
                    <input type="hidden" name="product_id" value={id} />
                    <input type="hidden" name="id" value={m.id} />
                    <button className="ds-btn" style={{ width: "100%", height: 34, color: "#B91C1C" }} type="submit">حذف</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <ImageUploader productId={id} />
      </Panel>

      <Panel title="عرض 360 (اختياري)">
        {r360.error ? (
          <Empty>هذه الميزة تحتاج تشغيل ملف supabase/phase03_360.sql في Supabase أولًا.</Empty>
        ) : (
          <Product360Manager
            productId={id}
            images={((r360.data ?? []) as { id: string; storage_path: string }[]).map((x) => ({
              id: x.id,
              url: sb.storage.from("product-360").getPublicUrl(x.storage_path).data.publicUrl,
            }))}
          />
        )}
      </Panel>

      <Panel title="الخيارات والتركيبات">
        {optRes.error ? (
          <Empty>تعذّر تحميل الخيارات.</Empty>
        ) : (
          <OptionsManager
            productId={id}
            activeLinked={vars.some((x) => x.is_active && linked.has(x.id))}
            options={opts.map((o) => ({
              id: o.id,
              name: o.name,
              kind: o.kind,
              values: [...(o.product_option_values ?? [])]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((v) => ({ id: v.id, value: v.value, used: usedValues.has(v.id) })),
            }))}
          />
        )}
        <h3 className="ds-panel-title" style={{ margin: "22px 0 12px" }}>التركيبات</h3>
        {vr.error ? (
          <Empty>تعذّر تحميل التركيبات.</Empty>
        ) : vars.length === 0 ? (
          <Empty>لا توجد تركيبات. أضف خيارًا بقيمه ثم اضغط «إنشاء التركيبات».</Empty>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {vars.map((x) => (
              <div key={x.id} style={{ border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 12, padding: 12, display: "grid", gap: 6, background: "var(--c-surface, #fff)", minWidth: 0 }}>
                <strong style={{ overflowWrap: "anywhere" }}>{x.sku ?? "-"}</strong>
                {x.barcode ? <div className="ds-kpi-hint" dir="ltr">{x.barcode}</div> : null}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {x.is_active ? <Badge tone="good">فعّال</Badge> : <Badge>متوقف</Badge>}
                  {!linked.has(x.id) ? <Badge tone="warn">قديم غير مربوط</Badge> : null}
                </div>
                <div style={{ fontSize: 14 }}>السعر النهائي: {fmtIQD((pr.data?.price ?? 0) + x.price_adjustment)}</div>
                <div style={{ fontSize: 14 }}>الكمية: {x.track_quantity ? fmtNum(x.quantity) : "من رصيد المنتج"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Link className="ds-btn" href={`/admin/products/${id}?v=${x.id}#variant`}>تعديل</Link>
                  <form action={toggleVariant}>
                    <input type="hidden" name="product_id" value={id} />
                    <input type="hidden" name="id" value={x.id} />
                    <input type="hidden" name="next" value={x.is_active ? "0" : "1"} />
                    <button className="ds-btn" type="submit">{x.is_active ? "إيقاف" : "تفعيل"}</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        {editing ? (
          <div id="variant" style={{ marginTop: 22 }}>
            <h3 className="ds-panel-title" style={{ marginBottom: 12 }}>تعديل التركيبة</h3>
            <VariantForm key={editing.id} productId={id} variant={editing} />
          </div>
        ) : null}
      </Panel>
    </section>
  );
}
