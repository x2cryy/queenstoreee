import { cache } from "react";
import { createPublicClient } from "./client";
import { publicImageUrl } from "./images";

type Id = string | number;

export type Category = { id: Id; parent_id: Id | null; name: string; slug: string; image_path: string | null; sort_order: number };
export type Banner = { id: Id; title: string | null; subtitle: string | null; image_path: string | null; link_url: string | null };
export type ProductCardData = {
  id: Id;
  name: string;
  slug: string;
  price: number;
  compareAt: number | null;
  discount: number | null;
  available: boolean;
  image: string | null;
};

type Row = {
  id: Id;
  name: string;
  slug: string;
  price: number | string;
  compare_at_price: number | string | null;
  quantity: number;
  status: string;
  product_images?: { storage_path: string; sort_order: number; is_primary: boolean }[] | null;
  product_variants?: { is_active: boolean; quantity: number; track_quantity: boolean; variant_option_values?: { option_value_id: string }[] | null }[] | null;
};

export const PRODUCT_SELECT =
  "id, name, slug, price, compare_at_price, quantity, status, product_images(storage_path, sort_order, is_primary), product_variants(is_active, quantity, track_quantity, variant_option_values(option_value_id))";

export function toCard(r: Row): ProductCardData {
  const price = Number(r.price) || 0;
  const cmp = r.compare_at_price == null ? null : Number(r.compare_at_price);
  let discount: number | null = null;
  let compareAt: number | null = null;
  if (cmp !== null && cmp > price && cmp > 0) {
    const pct = Math.round((1 - price / cmp) * 100);
    if (pct > 0) {
      discount = pct;
      compareAt = cmp;
    }
  }
  const variants = (r.product_variants ?? []).filter((v) => v.is_active && (v.variant_option_values ?? []).length > 0);
  const stockOk = variants.length
    ? variants.some((v) => !v.track_quantity || Number(v.quantity) > 0)
    : Number(r.quantity) > 0;
  const imgs = [...(r.product_images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    price,
    compareAt,
    discount,
    available: r.status !== "sold_out" && stockOk,
    image: publicImageUrl("product-images", imgs[0]?.storage_path),
  };
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("categories")
    .select("id, parent_id, name, slug, image_path, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Category[];
});

export const getBanners = cache(async (): Promise<Banner[]> => {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("banners")
    .select("id, title, subtitle, image_path, link_url")
    .order("sort_order")
    .limit(5);
  if (error) throw error;
  return (data ?? []) as unknown as Banner[];
});

export const getFeatured = cache(async (limit: number = 8): Promise<ProductCardData[]> => {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toCard);
});

export const getLatest = cache(async (limit: number = 8): Promise<ProductCardData[]> => {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toCard);
});
