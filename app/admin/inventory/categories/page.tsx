import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, ImageOff, Pencil } from "lucide-react";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { createClient } from "../../../../lib/supabase/server";
import { publicImageUrl } from "../../../../lib/shop/images";
import { fmtNum } from "../../../../lib/admin/fmt";
import { PageHead, Panel, Empty, Badge } from "../../_components/ui";
import { CreateForm, EditForm } from "./CategoryForms";
import { moveCategory, toggleCategory } from "./actions";
import st from "./categories.module.css";

type Cat = { id: string; name: string; image_path: string | null; is_active: boolean; sort_order: number };

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAnyPermission(["products"]);
  const sp = await searchParams;
  const sb = await createClient();
  const [cr, pr] = await Promise.all([
    sb.from("categories").select("id,name,image_path,is_active,sort_order").order("sort_order").order("created_at"),
    sb.from("products").select("category_id").range(0, 4999),
  ]);
  const back = <Link href="/admin/inventory" className="ds-btn"><ArrowRight size={16} /> العودة إلى المخزون</Link>;

  if (cr.error || pr.error) {
    return (
      <section className={st.page}>
        <PageHead title="إدارة التصنيفات" actions={back} />
        <Panel><Empty>تعذّر تحميل التصنيفات. <Link className="ds-btn" href="/admin/inventory/categories">إعادة المحاولة</Link></Empty></Panel>
      </section>
    );
  }

  const cats = (cr.data ?? []) as unknown as Cat[];
  const counts = new Map<string, number>();
  for (const r of (pr.data ?? []) as unknown as { category_id: string | null }[]) {
    if (r.category_id) counts.set(r.category_id, (counts.get(r.category_id) ?? 0) + 1);
  }
  const editing = sp.edit ? cats.find((c) => c.id === sp.edit) : undefined;

  return (
    <section className={st.page}>
      <PageHead title="إدارة التصنيفات" desc="أضف تصنيفاتك ورتّبها وتحكّم بظهورها في المتجر" actions={back} />

      <Panel title="إضافة تصنيف"><CreateForm /></Panel>

      {editing ? (
        <Panel title={`تعديل: ${editing.name}`} action={<Link className="ds-btn" href="/admin/inventory/categories">إغلاق</Link>}>
          <EditForm key={editing.id} id={editing.id} name={editing.name} />
        </Panel>
      ) : null}

      {cats.length === 0 ? (
        <Panel><Empty>لا توجد تصنيفات بعد. أضف أول تصنيف من النموذج أعلاه.</Empty></Panel>
      ) : (
        <div className={st.grid}>
          {cats.map((c, i) => {
            const img = c.image_path ? publicImageUrl("product-images", c.image_path) : null;
            return (
              <div key={c.id} className={st.card}>
                <div className={st.thumb}>
                  {img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="" loading="lazy" /> : <ImageOff size={26} />}
                </div>
                <div className={st.name}>{c.name}</div>
                <div className={st.muted}>{fmtNum(counts.get(c.id) ?? 0)} منتج</div>
                <div className={st.badges}>{c.is_active ? <Badge tone="good">ظاهر في المتجر</Badge> : <Badge>مخفي</Badge>}</div>
                <div className={st.actions}>
                  <Link className="ds-btn" href={`/admin/inventory/categories?edit=${c.id}`}><Pencil size={14} /> تعديل</Link>
                  <form action={toggleCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="ds-btn">{c.is_active ? "إخفاء" : "إظهار"}</button>
                  </form>
                  <form action={moveCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button type="submit" className="ds-btn" disabled={i === 0} aria-label="تقديم في الترتيب"><ArrowUp size={14} /></button>
                  </form>
                  <form action={moveCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button type="submit" className="ds-btn" disabled={i === cats.length - 1} aria-label="تأخير في الترتيب"><ArrowDown size={14} /></button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
