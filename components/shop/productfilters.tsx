import Link from "next/link";
import type { ListQuery } from "../../lib/shop/listing";

export default function ProductFilters({
  basePath,
  query,
}: {
  basePath: string;
  query: ListQuery;
}) {
  const active =
    query.q || query.min !== null || query.max !== null || query.inStock || query.sort !== "newest";
  return (
    <form action={basePath} method="get" className="qm-filters" role="search">
      <label className="qm-f qm-f-q">
        <span>بحث داخل الصفحة</span>
        <input name="q" type="search" defaultValue={query.q} placeholder="اسم المنتج" autoComplete="off" />
      </label>
      <label className="qm-f">
        <span>الترتيب</span>
        <select name="sort" defaultValue={query.sort}>
          <option value="newest">الأحدث</option>
          <option value="price_asc">السعر: من الأقل</option>
          <option value="price_desc">السعر: من الأعلى</option>
        </select>
      </label>
      <label className="qm-f qm-f-n">
        <span>أقل سعر</span>
        <input name="min" type="number" inputMode="numeric" min={0} defaultValue={query.min ?? ""} />
      </label>
      <label className="qm-f qm-f-n">
        <span>أعلى سعر</span>
        <input name="max" type="number" inputMode="numeric" min={0} defaultValue={query.max ?? ""} />
      </label>
      <label className="qm-f-check">
        <input name="stock" type="checkbox" value="1" defaultChecked={query.inStock} />
        <span>المتوفر فقط</span>
      </label>
      <div className="qm-f-act">
        <button type="submit" className="qm-btn qm-btn-gold">تطبيق</button>
        {active ? (
          <Link href={basePath} className="qm-more">مسح الفلاتر</Link>
        ) : null}
      </div>
    </form>
  );
}
