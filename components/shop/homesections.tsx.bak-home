import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import type { Category, ProductCardData } from "../../lib/shop/queries";
import type { HomeSection, HomeSectionId } from "../../lib/shop/site-content-types";

// Single source of the home sections: used by the shop home page and by the admin live preview.
export default function HomeSections({
  sections,
  cats,
  featured: featuredAll,
  latest: latestAll,
}: {
  sections: HomeSection[];
  cats: Category[];
  featured: ProductCardData[];
  latest: ProductCardData[];
}) {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const lim = (id: HomeSectionId) => byId.get(id)?.limit ?? 8;
  const title = (id: HomeSectionId) => byId.get(id)?.title ?? "";
  const top = cats.filter((c) => c.parent_id == null).slice(0, lim("categories"));
  const featured = featuredAll.slice(0, lim("featured"));
  const latest = latestAll.slice(0, lim("latest"));

  const blocks: Record<HomeSectionId, ReactNode> = {
    categories:
      top.length > 0 ? (
        <section className="qm-sec qm-wrap" aria-label={title("categories")}>
          <div className="qm-sec-h">
            <h2>{title("categories")}</h2>
            <Link href="/categories" className="qm-more">كل الأقسام</Link>
          </div>
          <div className="qm-cats">
            {top.map((c) => (
              <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`} className="qm-cat">
                <span className="qm-cat-ico">{c.name.trim().charAt(0)}</span>
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null,
    featured:
      featured.length > 0 ? (
        <section className="qm-sec qm-wrap" aria-label={title("featured")}>
          <div className="qm-sec-h">
            <h2>{title("featured")}</h2>
            <Link href="/products" className="qm-more">عرض الكل</Link>
          </div>
          <div className="qm-grid">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      ) : null,
    latest:
      latest.length > 0 ? (
        <section className="qm-sec qm-wrap" aria-label={title("latest")}>
          <div className="qm-sec-h">
            <h2>{title("latest")}</h2>
            <Link href="/products" className="qm-more">عرض الكل</Link>
          </div>
          <div className="qm-grid">
            {latest.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      ) : null,
  };

  return (
    <>
      {sections
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{blocks[s.id]}</Fragment>
        ))}
    </>
  );
}
