import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductListing from "../../../../components/shop/ProductListing";
import { getCategories } from "../../../../lib/shop/queries";
import { listProducts, parseListQuery } from "../../../../lib/shop/listing";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findCategory(slug: string) {
  const cats = await getCategories();
  const decoded = decodeURIComponent(slug);
  const cat = cats.find((c) => c.slug === decoded);
  return { cats, cat };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { cat } = await findCategory(slug);
  return { title: cat ? cat.name : "القسم" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { cats, cat } = await findCategory(slug);
  if (!cat) notFound();

  const children = cats.filter((c) => c.parent_id != null && String(c.parent_id) === String(cat.id));
  const ids = [cat.id, ...children.map((c) => c.id)];
  const query = parseListQuery(await searchParams);
  const { items, total, pages } = await listProducts(query, ids);
  const basePath = `/category/${encodeURIComponent(cat.slug)}`;

  return (
    <div className="qm-wrap">
      <div className="qm-pagehead">
        <h1>{cat.name}</h1>
        {children.length > 0 && (
          <div className="qm-chips">
            {children.map((c) => (
              <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link>
            ))}
          </div>
        )}
      </div>
      <ProductListing basePath={basePath} query={query} items={items} total={total} pages={pages} />
    </div>
  );
}
