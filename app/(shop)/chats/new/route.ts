import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get("kind") ?? "general";
  const order = sp.get("order");
  let product = sp.get("product");
  const slug = sp.get("slug");
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { const nx = req.nextUrl.pathname + req.nextUrl.search; return NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(nx), req.url)); }
  if (!product && slug && slug.length <= 200) {
    const { data: p } = await sb.from("products").select("id").eq("slug", slug).maybeSingle();
    product = p?.id ?? null;
  }
  if (!["general", "order", "product", "support"].includes(kind) || (order && !UUID.test(order)) || (product && !UUID.test(product)))
    return NextResponse.redirect(new URL("/chats", req.url));
  const { data, error } = await sb.rpc("chat_start", { p_kind: kind, p_order_id: order, p_product_id: product, p_force_new: sp.get("new") === "1" });
  if (error || !data) return NextResponse.redirect(new URL("/chats?error=1", req.url));
  return NextResponse.redirect(new URL(`/chats/${data}`, req.url));
}
