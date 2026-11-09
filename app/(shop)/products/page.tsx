import type { Metadata } from "next";
import ProductListing from "../../../components/shop/ProductListing";
import { listProducts, parseListQuery } from "../../../lib/shop/listing";

export const revalidate = 60;
export const metadata: Metadata = { title: "جميع المنتجات" };

export default async function AllProducts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams);
  const { items, total, pages } = await listProducts(query);
  return (
    <div className="qm-wrap">
      <div className="qm-pagehead">
        <h1>جميع المنتجات</h1>
      </div>
      <ProductListing basePath="/products" query={query} items={items} total={total} pages={pages} />
    </div>
  );
}
