import { cache } from "react";
import { createPublicClient } from "./client";
import { publicImageUrl } from "./images";
import { PRODUCT_SELECT, toCard, type ProductCardData } from "./queries";

// حاوية صور المتغيرات. غيّرها هنا إذا كانت مختلفة.
const VARIANT_BUCKET = "product-images";

export type GalleryImage = { url: string; alt: string };
export type OptionValue = { id: string; label: string; colorHex: string | null };
export type Option = { id: string; name: string; kind: string; values: OptionValue[] };
export type Variant = {
  id: string;
  sku: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  valueIds: string[];
  imageUrl: string | null;
};
export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  categoryId: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  lowStock: number;
  inStock: boolean;
  images: GalleryImage[];
  options: Option[];
  variants: Variant[];
};

type Raw = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  quantity: number;
  low_stock_threshold: number;
  status: string;
  product_images:
    | { id: string; storage_path: string; alt_text: string | null; sort_order: number; is_primary: boolean }[]
    | null;
  product_options:
    | {
        id: string;
        name: string;
        kind: string;
        sort_order: number;
        product_option_values:
          | { id: string; value: string; color_hex: string | null; sort_order: number }[]
          | null;
      }[]
    | null;
  product_variants:
    | {
        id: string;
        sku: string | null;
        price_adjustment: number | string;
        quantity: number;
        track_quantity: boolean;
        image_path: string | null;
        is_active: boolean;
        variant_option_values: { option_value_id: string }[] | null;
      }[]
    | null;
};

const DETAIL_SELECT =
  "id, name, slug, description, brand, category_id, price, compare_at_price, quantity, low_stock_threshold, status, " +
  "product_images(id, storage_path, alt_text, sort_order, is_primary), " +
  "product_options(id, name, kind, sort_order, product_option_values(id, value, color_hex, sort_order)), " +
  "product_variants(id, sku, price_adjustment, quantity, track_quantity, image_path, is_active, variant_option_values(option_value_id))";

function toDetail(r: Raw): ProductDetail {
  const price = Number(r.price) || 0;
  const cmpRaw = r.compare_at_price == null ? null : Number(r.compare_at_price);
  const compareAt = cmpRaw !== null && cmpRaw > price ? cmpRaw : null;
  const soldOut = r.status === "sold_out";
  const baseQty = soldOut ? 0 : Math.max(0, Number(r.quantity) || 0);

  const images: GalleryImage[] = [];
  const sortedImgs = [...(r.product_images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  for (const i of sortedImgs) {
    const url = publicImageUrl("product-images", i.storage_path);
    if (url) images.push({ url, alt: i.alt_text || r.name });
  }

  const options: Option[] = [...(r.product_options ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
      values: [...(o.product_option_values ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((v) => ({ id: v.id, label: v.value, colorHex: v.color_hex })),
    }))
    .filter((o) => o.values.length > 0);

  const variants: Variant[] = [];
  for (const v of r.product_variants ?? []) {
    if (!v.is_active) continue;
    const valueIds = (v.variant_option_values ?? []).map((x) => x.option_value_id);
    if (valueIds.length === 0) continue;
    const adj = Number(v.price_adjustment) || 0;
    const stock = soldOut ? 0 : v.track_quantity ? Math.max(0, Number(v.quantity) || 0) : baseQty;
    const imageUrl = publicImageUrl(VARIANT_BUCKET, v.image_path);
    variants.push({
      id: v.id,
      sku: v.sku,
      price: price + adj,
      compareAt: compareAt !== null ? compareAt + adj : null,
      stock,
      valueIds,
      imageUrl,
    });
    if (imageUrl && !images.some((i) => i.url === imageUrl)) {
      images.push({ url: imageUrl, alt: r.name });
    }
  }

  const useOptions = options.length > 0 && variants.length > 0;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    brand: r.brand,
    categoryId: r.category_id,
    price,
    compareAt,
    stock: baseQty,
    lowStock: Math.max(0, Number(r.low_stock_threshold) || 0),
    inStock: useOptions ? variants.some((v) => v.stock > 0) : baseQty > 0,
    images,
    options: useOptions ? options : [],
    variants: useOptions ? variants : [],
  };
}

export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("products")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .neq("status", "hidden")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toDetail(data as unknown as Raw);
});

export const getRelated = cache(
  async (categoryId: string | null, excludeId: string): Promise<ProductCardData[]> => {
    if (!categoryId) return [];
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("category_id", categoryId)
      .neq("id", excludeId)
      .neq("status", "hidden")
      .order("created_at", { ascending: false })
      .limit(4);
    if (error) return [];
    return ((data ?? []) as unknown as Parameters<typeof toCard>[0][]).map(toCard);
  }
);
