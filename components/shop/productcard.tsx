import Link from "next/link";
import type { ProductCardData } from "../../lib/shop/queries";
import { publicImageUrl } from "../../lib/shop/images";
import { formatPrice } from "../../lib/shop/format";

import FavButton from "./FavButton";
export default function ProductCard({ p }: { p: ProductCardData }) {
  const src = publicImageUrl("product-images", p.image);
  const href = `/product/${encodeURIComponent(p.slug)}`;
  return (
    <article className="qm-card">
      <FavButton slug={p.slug} overlay />
      <Link href={href} className="qm-card-img" aria-label={p.name}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={p.name} loading="lazy" decoding="async" />
        ) : (
          <span className="qm-noimg qm-logo">QUEEN STORE</span>
        )}
        {p.discount ? <span className="qm-tag">خصم {p.discount}%</span> : null}
        {!p.available ? <span className="qm-soldout">غير متوفر</span> : null}
      </Link>
      <div className="qm-card-body">
        <h3>{p.name}</h3>
        <div className="qm-price">
          <strong>{formatPrice(p.price)}</strong>
          {p.compareAt ? <s>{formatPrice(p.compareAt)}</s> : null}
        </div>
        <Link href={href} className="qm-view">عرض المنتج</Link>
      </div>
    </article>
  );
}
