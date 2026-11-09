import { createPublicClient } from "./client";
import { PRODUCT_SELECT, toCard, type ProductCardData } from "./queries";

export const PAGE_SIZE = 12;

export type Sort = "newest" | "price_asc" | "price_desc";
export type ListQuery = {
  q: string;
  sort: Sort;
  min: number | null;
  max: number | null;
  inStock: boolean;
  page: number;
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => {
  const s = one(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseListQuery(sp: SP): ListQuery {
  const sortRaw = one(sp.sort);
  const sort: Sort =
    sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest";
  const page = Math.max(1, Math.floor(num(sp.page) ?? 1));
  return {
    q: (one(sp.q) ?? "").trim().slice(0, 80),
    sort,
    min: num(sp.min),
    max: num(sp.max),
    inStock: one(sp.stock) === "1",
    page,
  };
}

export async function listProducts(
  q: ListQuery,
  categoryIds?: (string | number)[]
): Promise<{ items: ProductCardData[]; total: number; pages: number }> {
  const sb = createPublicClient();
  let query = sb.from("products").select(PRODUCT_SELECT, { count: "exact" });

  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  const term = q.q.replace(/[%_\\,()*]/g, " ").trim();
  if (term) query = query.ilike("name", `%${term}%`);
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
    if (error.code === "PGRST103") {
      return { items: [], total: count ?? 0, pages: 1 };
    }
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
