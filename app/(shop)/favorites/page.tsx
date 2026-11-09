import { cookies } from "next/headers";
import ProductCard from "../../../components/shop/ProductCard";
import { PRODUCT_SELECT, toCard } from "../../../lib/shop/queries";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "المفضلة | QUEEN STORE" };

export default async function FavoritesPage() {
  const jar = await cookies();
  const raw = jar.get("qs_fav")?.value ?? "";
  const slugs = raw.split(",").filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  }).slice(0, 60);

  let items: ReturnType<typeof toCard>[] = [];
  if (slugs.length > 0) {
    const sb = await createClient();
    const { data } = await sb.from("products").select(PRODUCT_SELECT).in("slug", slugs);
    items = ((data ?? []) as never[]).map((r) => toCard(r));
  }

  return (
    <main className="qm-wrap" style={{ paddingBlock: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>المفضلة</h1>
      {items.length === 0 ? (
        <p style={{ color: "#6B6254" }}>لا توجد منتجات في المفضلة بعد. اضغط على القلب في أي منتج لإضافته.</p>
      ) : (
        <div className="qf-grid">
          {items.map((p) => (<ProductCard key={p.id} p={p} />))}
        </div>
      )}
    </main>
  );
}
