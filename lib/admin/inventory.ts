import { createClient } from "../supabase/server";
import { publicImageUrl } from "../shop/images";

export const PAGE_SIZE = 24;
// اسم bucket صور التصنيفات غير معروف بعد، يُضبط في دفعة التصنيفات
export const CATEGORY_BUCKET: string | null = "product-images";

export type Slim = { id: string; category_id: string | null; quantity: number; low_stock_threshold: number; status: string };
export type Cat = { id: string; name: string; image_path: string | null; is_active: boolean };
export type Counts = { total: number; low: number; out: number };
export type Overview = {
  slim: Slim[];
  cats: Cat[];
  totals: { all: number; low: number; out: number; hidden: number };
  perCat: Record<string, Counts>;
};
export type Filters = { q: string; c: string; v: string; s: string; o: string; pg: number };
export type Item = {
  id: string; name: string; brand: string | null; price: number; priceFrom: boolean;
  quantity: number; low: number; status: string; image: string | null;
  variants: number; variantsOut: number;
};

export const isOut = (p: { quantity: number }) => p.quantity <= 0;
export const isLow = (p: { quantity: number; low_stock_threshold: number }) =>
  p.quantity > 0 && p.quantity <= p.low_stock_threshold;

export async function getOverview(): Promise<Overview | null> {
  const sb = await createClient();
  const [pr, cr] = await Promise.all([
    sb.from("products").select("id,category_id,quantity,low_stock_threshold,status").range(0, 4999),
    sb.from("categories").select("id,name,image_path,is_active,sort_order").order("sort_order"),
  ]);
  if (pr.error || cr.error) return null;
  const slim = (pr.data ?? []) as unknown as Slim[];
  const cats = (cr.data ?? []) as unknown as Cat[];
  const perCat: Record<string, Counts> = {};
  const totals = { all: slim.length, low: 0, out: 0, hidden: 0 };
  for (const p of slim) {
    const k = p.category_id ?? "none";
    const c = (perCat[k] ??= { total: 0, low: 0, out: 0 });
    c.total++;
    if (isOut(p)) { c.out++; totals.out++; }
    else if (isLow(p)) { c.low++; totals.low++; }
    if (p.status === "hidden") totals.hidden++;
  }
  return { slim, cats, totals, perCat };
}

type Row = {
  id: string; name: string; brand: string | null; price: number; quantity: number;
  low_stock_threshold: number; status: string;
  product_variants: { price_adjustment: number | null; quantity: number; is_active: boolean }[] | null;
};

export async function getList(f: Filters, slim: Slim[]) {
  const sb = await createClient();
  const lowIds = slim.filter(isLow).map((p) => p.id).slice(0, 300);
  let qb = sb
    .from("products")
    .select("id,name,brand,price,quantity,low_stock_threshold,status,product_variants(price_adjustment,quantity,is_active)", { count: "exact" });

  if (f.c === "none") qb = qb.is("category_id", null);
  else if (f.c && f.c !== "all") qb = qb.eq("category_id", f.c);
  if (f.v === "hidden") qb = qb.eq("status", "hidden");
  if (f.v === "shown") qb = qb.neq("status", "hidden");

  if (f.q) {
    const { data: vr } = await sb
      .from("product_variants").select("product_id")
      .or(`sku.ilike.%${f.q}%,barcode.ilike.%${f.q}%`).limit(100);
    const vIds = [...new Set(((vr ?? []) as unknown as { product_id: string }[]).map((r) => r.product_id))];
    const parts = [`name.ilike.%${f.q}%`, `brand.ilike.%${f.q}%`, `barcode.ilike.%${f.q}%`];
    if (vIds.length) parts.push(`id.in.(${vIds.join(",")})`);
    qb = qb.or(parts.join(","));
  }

  if (f.s === "out") qb = qb.lte("quantity", 0);
  if (f.s === "low") {
    qb = lowIds.length ? qb.in("id", lowIds) : qb.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (f.s === "ok") {
    qb = qb.gt("quantity", 0);
    if (lowIds.length) qb = qb.not("id", "in", `(${lowIds.join(",")})`);
  }

  if (f.o === "name") qb = qb.order("name", { ascending: true });
  else if (f.o === "qty") qb = qb.order("quantity", { ascending: true });
  else if (f.o === "price_asc") qb = qb.order("price", { ascending: true });
  else if (f.o === "price_desc") qb = qb.order("price", { ascending: false });
  else qb = qb.order("created_at", { ascending: false });

  const from = (f.pg - 1) * PAGE_SIZE;
  const { data, error, count } = await qb.range(from, from + PAGE_SIZE - 1);
  if (error) {
    if (error.code === "PGRST103") return { items: [] as Item[], total: count ?? 0, pages: 1 };
    throw error;
  }
  const rows = (data ?? []) as unknown as Row[];
  const thumbs = new Map<string, string | null>();
  if (rows.length) {
    const { data: imgs } = await sb
      .from("product_images").select("product_id,storage_path")
      .eq("is_primary", true).in("product_id", rows.map((r) => r.id));
    for (const i of (imgs ?? []) as unknown as { product_id: string; storage_path: string }[]) {
      thumbs.set(i.product_id, publicImageUrl("product-images", i.storage_path));
    }
  }
  const items: Item[] = rows.map((r) => {
    const act = (r.product_variants ?? []).filter((v) => v.is_active);
    const prices = act.map((v) => Number(r.price) + Number(v.price_adjustment ?? 0));
    const min = prices.length ? Math.min(...prices) : Number(r.price);
    const max = prices.length ? Math.max(...prices) : Number(r.price);
    return {
      id: r.id, name: r.name, brand: r.brand, price: min, priceFrom: max > min,
      quantity: r.quantity, low: r.low_stock_threshold, status: r.status,
      image: thumbs.get(r.id) ?? null,
      variants: act.length, variantsOut: act.filter((v) => v.quantity <= 0).length,
    };
  });
  const total = count ?? 0;
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdjustTarget(id: string) {
  const sb = await createClient();
  const [pr, vr] = await Promise.all([
    sb.from("products").select("id,name,quantity").eq("id", id).maybeSingle(),
    sb.from("product_variants").select("id,sku,barcode,quantity,track_quantity").eq("product_id", id).eq("is_active", true).order("created_at"),
  ]);
  if (!pr.data) return null;
  const p = pr.data as unknown as { id: string; name: string; quantity: number };
  const variants = ((vr.data ?? []) as unknown as { id: string; sku: string | null; barcode: string | null; quantity: number; track_quantity: boolean }[]).map((v, i) => ({
    id: v.id, label: v.sku || v.barcode || `خيار ${i + 1}`, quantity: v.quantity, track: v.track_quantity,
  }));
  return { ...p, variants };
}

export type Detail = {
  product: {
    id: string; name: string; slug: string | null; brand: string | null; description: string | null;
    price: number; compare_at_price: number | null; quantity: number; low_stock_threshold: number;
    status: string; barcode: string | null; category: string | null; created_at: string; updated_at: string;
  };
  cost: number | null;
  images: { id: string; url: string | null; primary: boolean }[];
  variants: { id: string; sku: string | null; barcode: string | null; price_adjustment: number; quantity: number; track_quantity: boolean; is_active: boolean }[];
  movements: { id: string; movement_type: string; quantity_before: number; change: number; quantity_after: number; reason: string | null; created_at: string }[];
  logs: { id: number; action: string; created_at: string }[];
};

export async function getDetail(id: string, catName: Map<string, string>): Promise<Detail | null> {
  const sb = await createClient();
  const [dp, dc, di, dv, dm, dl] = await Promise.all([
    sb.from("products").select("id,name,slug,brand,description,price,compare_at_price,quantity,low_stock_threshold,status,barcode,category_id,created_at,updated_at").eq("id", id).maybeSingle(),
    sb.from("product_costs").select("cost_price").eq("product_id", id).maybeSingle(),
    sb.from("product_images").select("id,storage_path,is_primary").eq("product_id", id).order("sort_order"),
    sb.from("product_variants").select("id,sku,barcode,price_adjustment,quantity,track_quantity,is_active").eq("product_id", id).order("created_at"),
    sb.from("inventory_movements").select("id,movement_type,quantity_before,change,quantity_after,reason,created_at").eq("product_id", id).order("created_at", { ascending: false }).limit(20),
    sb.from("activity_logs").select("id,action,created_at").in("entity_type", ["product", "products"]).eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!dp.data) return null;
  const p = dp.data as unknown as Detail["product"] & { category_id: string | null };
  const cost = (dc.data as { cost_price: number } | null)?.cost_price;
  return {
    product: { ...p, category: p.category_id ? catName.get(p.category_id) ?? null : null },
    cost: cost === undefined || cost === null ? null : Number(cost),
    images: ((di.data ?? []) as unknown as { id: string; storage_path: string; is_primary: boolean }[]).map((i) => ({
      id: i.id, url: publicImageUrl("product-images", i.storage_path), primary: i.is_primary,
    })),
    variants: (dv.data ?? []) as unknown as Detail["variants"],
    movements: (dm.data ?? []) as unknown as Detail["movements"],
    logs: (dl.data ?? []) as unknown as Detail["logs"],
  };
}
