import { createPublicClient } from "./client";
import { getCategories, PRODUCT_SELECT, toCard, type ProductCardData } from "./queries";
import { PAGE_SIZE, type ListQuery } from "./listing";

export function cleanTerm(s: string) {
  return s
    .replace(/[%_\\,()*."'`:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function searchProducts(
  q: ListQuery
): Promise<{ items: ProductCardData[]; total: number; pages: number }> {
  const term = cleanTerm(q.q);
  if (!term) return { items: [], total: 0, pages: 1 };

  const sb = createPublicClient();
  const [variantRes, cats] = await Promise.all([
    sb.from("product_variants").select("product_id").ilike("sku", `%${term}%`).limit(50),
    getCategories().catch(() => []),
  ]);

  const productIds = [
    ...new Set((variantRes.data ?? []).map((r) => String(r.product_id))),
  ];

  const lower = term.toLowerCase();
  const matched = cats.filter((c) => c.name.toLowerCase().includes(lower));
  const catIds = new Set(matched.map((c) => String(c.id)));
  for (const c of cats) {
    if (c.parent_id != null && matched.some((m) => String(m.id) === String(c.parent_id))) {
      catIds.add(String(c.id));
    }
  }

  const like = `"%${term}%"`;
  const parts = [
    `name.ilike.${like}`,
    `description.ilike.${like}`,
    `brand.ilike.${like}`,
    `barcode.ilike.${like}`,
  ];
  if (productIds.length > 0) parts.push(`id.in.(${productIds.join(",")})`);
  if (catIds.size > 0) parts.push(`category_id.in.(${[...catIds].join(",")})`);

  let query = sb
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .neq("status", "hidden")
    .or(parts.join(","));

  if (q.min !== null) query = query.gte("price", q.min);
  if (q.max !== null) query = query.lte("price", q.max);
  if (q.inStock) query = query.gt("quantity", 0);

  if (q.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (q.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  query = query.order("id", { ascending: true });

  const from = (q.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);

  if (error) {
    if (error.code === "PGRST103") return { items: [], total: count ?? 0, pages: 1 };
    throw error;
  }
  const total = count ?? 0;
  const rows = (data ?? []) as unknown as Parameters<typeof toCard>[0][];
  return {
    items: rows.map(toCard),
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
