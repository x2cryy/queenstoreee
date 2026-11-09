import Link from "next/link";
import type { Metadata } from "next";
import ProductListing from "../../../components/shop/ProductListing";
import { getCategories, type ProductCardData } from "../../../lib/shop/queries";
import { parseListQuery } from "../../../lib/shop/listing";
import { searchProducts } from "../../../lib/shop/search";

export const metadata: Metadata = { title: "البحث", robots: { index: false } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams);
  const cats = await getCategories().catch(() => []);
  const top = cats.filter((c) => c.parent_id == null);

  const suggestions =
    top.length > 0 ? (
      <>
        <p className="qm-sug-title">تصفح الأقسام</p>
        <div className="qm-chips">
          {top.map((c) => (
            <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`}>
              {c.name}
            </Link>
          ))}
        </div>
      </>
    ) : null;

  if (!query.q) {
    return (
      <div className="qm-wrap">
        <div className="qm-pagehead">
          <h1>البحث</h1>
          <p>اكتب اسم المنتج أو رقمه أو القسم في شريط البحث.</p>
        </div>
        {suggestions}
      </div>
    );
  }

  const empty = { items: [] as ProductCardData[], total: 0, pages: 1 };
  let res = empty;
  let failed = false;
  try {
    res = await searchProducts(query);
  } catch {
    failed = true;
  }

  return (
    <div className="qm-wrap">
      <div className="qm-pagehead">
        <h1>نتائج البحث عن «{query.q}»</h1>
      </div>
      {failed ? (
        <div className="qm-empty">
          <h2>تعذر تنفيذ البحث</h2>
          <p>تحقق من اتصالك ثم حاول مجدداً.</p>
        </div>
      ) : (
        <>
          <ProductListing
            basePath="/search"
            query={query}
            items={res.items}
            total={res.total}
            pages={res.pages}
          />
          {res.total === 0 ? suggestions : null}
        </>
      )}
    </div>
  );
}
