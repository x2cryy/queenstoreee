import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import Pagination from "./Pagination";
import type { ListQuery } from "../../lib/shop/listing";
import type { ProductCardData } from "../../lib/shop/queries";

export default function ProductListing({
  basePath,
  query,
  items,
  total,
  pages,
}: {
  basePath: string;
  query: ListQuery;
  items: ProductCardData[];
  total: number;
  pages: number;
}) {
  return (
    <>
      <ProductFilters basePath={basePath} query={query} />
      <p className="qm-count">{total} منتج</p>
      {items.length === 0 ? (
        <div className="qm-empty">
          <h2>لا توجد منتجات مطابقة</h2>
          <p>جرّب تغيير الفلاتر أو كلمة البحث.</p>
        </div>
      ) : (
        <div className="qm-grid">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
      <Pagination basePath={basePath} query={query} pages={pages} />
    </>
  );
}
