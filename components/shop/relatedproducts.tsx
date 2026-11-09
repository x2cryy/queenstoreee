import { getRelated } from "../../lib/shop/product";
import ProductCard from "./ProductCard";

export default async function RelatedProducts({
  categoryId,
  excludeId,
}: {
  categoryId: string | null;
  excludeId: string;
}) {
  const items = await getRelated(categoryId, excludeId);
  if (!items.length) return null;
  return (
    <section className="qm-related">
      <h2>منتجات مشابهة</h2>
      <div className="qm-rel-grid">
        {items.map((p) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}
