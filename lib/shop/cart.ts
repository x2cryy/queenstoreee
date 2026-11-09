import { createPublicClient } from "./client";
import { publicImageUrl } from "./images";

export const CART_KEY = "queen_cart_v1";
export const CART_MAX_LINES = 50;
export const CHECKOUT_PATH = "/checkout";

// نفس حاوية صور المتغيرات الموجودة في lib/shop/product.ts
const VARIANT_BUCKET = "product-images";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CartItem = { productId: string; variantId: string | null; qty: number };

type OptName = { name: string; sort_order: number };
type OptVal = { value: string; product_options: OptName | OptName[] | null };

export type CartProductRaw = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  compare_at_price: number | string | null;
  quantity: number;
  status: string;
  product_images: { storage_path: string; sort_order: number; is_primary: boolean }[] | null;
  product_variants:
    | {
        id: string;
        sku: string | null;
        price_adjustment: number | string;
        quantity: number;
        track_quantity: boolean;
        image_path: string | null;
        is_active: boolean;
        variant_option_values:
          | { product_option_values: OptVal | OptVal[] | null }[]
          | null;
      }[]
    | null;
};

const CART_SELECT =
  "id, name, slug, price, compare_at_price, quantity, status, " +
  "product_images(storage_path, sort_order, is_primary), " +
  "product_variants(id, sku, price_adjustment, quantity, track_quantity, image_path, is_active, " +
  "variant_option_values(product_option_values(value, product_options(name, sort_order))))";

export async function fetchCartProducts(
  ids: string[]
): Promise<Record<string, CartProductRaw>> {
  const clean = [...new Set(ids)].filter((i) => UUID.test(i));
  if (clean.length === 0) return {};
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("products")
    .select(CART_SELECT)
    .in("id", clean)
    .neq("status", "hidden");
  if (error) throw error;
  const map: Record<string, CartProductRaw> = {};
  for (const r of (data ?? []) as unknown as CartProductRaw[]) map[String(r.id)] = r;
  return map;
}

export type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string | null;
  image: string | null;
  label: string | null;
  sku: string | null;
  unitPrice: number;
  compareAt: number | null;
  stock: number;
  qty: number;
  status: "ok" | "adjusted" | "out" | "gone";
};

const first = <T>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null);

function gone(key: string, it: CartItem): CartLine {
  return {
    key,
    productId: it.productId,
    variantId: it.variantId,
    name: "منتج لم يعد متاحاً",
    slug: null,
    image: null,
    label: null,
    sku: null,
    unitPrice: 0,
    compareAt: null,
    stock: 0,
    qty: 0,
    status: "gone",
  };
}

export function buildLines(
  items: CartItem[],
  products: Record<string, CartProductRaw>
): CartLine[] {
  return items.map((it) => {
    const key = `${it.productId}:${it.variantId ?? ""}`;
    const p = products[it.productId];
    if (!p) return gone(key, it);

    const base = Number(p.price) || 0;
    const cmpRaw = p.compare_at_price == null ? null : Number(p.compare_at_price);
    const baseCmp = cmpRaw !== null && cmpRaw > base ? cmpRaw : null;
    const soldOut = p.status === "sold_out";
    const baseQty = soldOut ? 0 : Math.max(0, Number(p.quantity) || 0);

    const primary = [...(p.product_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
    )[0];
    let image = publicImageUrl("product-images", primary?.storage_path);
    let label: string | null = null;
    let sku: string | null = null;
    let unitPrice = base;
    let compareAt = baseCmp;
    let stock = baseQty;

    if (it.variantId) {
      const v = (p.product_variants ?? []).find((x) => x.id === it.variantId && x.is_active);
      if (!v) return gone(key, it);
      const adj = Number(v.price_adjustment) || 0;
      unitPrice = base + adj;
      compareAt = baseCmp !== null ? baseCmp + adj : null;
      stock = soldOut ? 0 : v.track_quantity ? Math.max(0, Number(v.quantity) || 0) : baseQty;
      sku = v.sku;
      image = publicImageUrl(VARIANT_BUCKET, v.image_path) ?? image;
      const parts = (v.variant_option_values ?? [])
        .map((x) => {
          const val = first(x.product_option_values);
          if (!val) return null;
          const opt = first(val.product_options);
          return {
            order: opt?.sort_order ?? 0,
            text: opt?.name ? `${opt.name}: ${val.value}` : val.value,
          };
        })
        .filter((x): x is { order: number; text: string } => x !== null)
        .sort((a, b) => a.order - b.order)
        .map((x) => x.text);
      label = parts.length > 0 ? parts.join(" · ") : null;
    }

    let status: CartLine["status"] = "ok";
    let qty = Math.max(1, it.qty);
    if (stock < 1) {
      status = "out";
      qty = 0;
    } else if (qty > stock) {
      status = "adjusted";
      qty = stock;
    }

    return {
      key,
      productId: it.productId,
      variantId: it.variantId,
      name: p.name,
      slug: p.slug,
      image,
      label,
      sku,
      unitPrice,
      compareAt: compareAt !== null && compareAt > unitPrice ? compareAt : null,
      stock,
      qty,
      status,
    };
  });
}
