import RelatedProducts from "../../../../components/shop/RelatedProducts";
import ProductChatLink from "../../../../components/chat/ProductChatLink";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductView from "../../../../components/shop/ProductView";
import ProductCard from "../../../../components/shop/ProductCard";
import { getProduct, getRelated } from "../../../../lib/shop/product";
import { getCategories, type Category } from "../../../../lib/shop/queries";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(safeDecode(slug));
  if (!p) return { title: "المنتج غير موجود" };
  const desc =
    (p.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160) || `${p.name} من QUEEN STORE`;
  return {
    title: p.name,
    description: desc,
    openGraph: {
      title: p.name,
      description: desc,
      images: p.images[0] ? [p.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(safeDecode(slug));
  if (!product) notFound();

  let cats: Category[] = [];
  try {
    cats = await getCategories();
  } catch {
    cats = [];
  }
  const related = await getRelated(product.categoryId, product.id);
  const cat = cats.find((c) => String(c.id) === String(product.categoryId));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "IQD",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="qm-wrap">
      <div style={{ margin: "12px 0" }}><ProductChatLink /></div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav className="qm-crumbs" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link>
        {cat ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/category/${encodeURIComponent(cat.slug)}`}>{cat.name}</Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      <ProductView product={product} related={<RelatedProducts categoryId={product.categoryId} excludeId={product.id} />} />

      {(product.description || product.brand || cat) && (
        <section className="qm-sec" aria-label="تفاصيل المنتج">
          {product.description ? (
            <>
              <h2 className="qm-h2">الوصف</h2>
              <p className="qm-desc">{product.description}</p>
            </>
          ) : null}
          {(product.brand || cat) && (
            <>
              <h2 className="qm-h2">معلومات إضافية</h2>
              <dl className="qm-dl">
                {product.brand ? (
                  <>
                    <dt>العلامة</dt>
                    <dd>{product.brand}</dd>
                  </>
                ) : null}
                {cat ? (
                  <>
                    <dt>القسم</dt>
                    <dd>
                      <Link href={`/category/${encodeURIComponent(cat.slug)}`}>{cat.name}</Link>
                    </dd>
                  </>
                ) : null}
              </dl>
            </>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section className="qm-sec" aria-label="منتجات مرتبطة">
          <div className="qm-sec-h">
            <h2>منتجات مرتبطة</h2>
          </div>
          <div className="qm-grid">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
