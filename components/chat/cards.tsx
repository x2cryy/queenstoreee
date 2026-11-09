"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, Receipt, ShoppingBag } from "lucide-react";
import { createClient } from "../../lib/supabase/browser";
import { fmtMoney, STATUS_AR } from "../../lib/chat/types";
import { publicImageUrl } from "../../lib/shop/images";

type PImg = { storage_path: string; sort_order: number; is_primary: boolean };
type Prod = { name: string; slug: string; price: number; product_images: PImg[] | null };
function thumbOf(p: Prod) {
  const im = [...(p.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
  return im ? publicImageUrl("product-images", im.storage_path) : null;
}

const shell = "block w-64 max-w-full rounded-xl border border-[#B89B6A]/40 bg-white p-3 text-[#17140F]";
const icon = "grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#FBF7EF] text-[#B89B6A]";

export function ProductCard({ id }: { id: string }) {
  const [p, setP] = useState<Prod | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    createClient().from("products").select("name,slug,price,product_images(storage_path,sort_order,is_primary)").eq("id", id).maybeSingle()
      .then(({ data }) => { if (on) setP((data as unknown as Prod | null) ?? null); });
    return () => { on = false; };
  }, [id]);
  if (p === undefined) return <div className={shell + " h-16 animate-pulse"} />;
  if (p === null) return <div className={shell + " text-sm text-[#7D6335]"}>المنتج غير متاح</div>;
  return (
    <Link href={`/product/${p.slug}`} className={shell + " flex items-center gap-3"}>
      {thumbOf(p) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbOf(p)!} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className={icon}><Package size={22} /></span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{p.name}</span>
        <span className="block text-sm text-[#7D6335]" dir="ltr">{fmtMoney(p.price)}</span>
        <span className="block text-xs text-[#B89B6A]">عرض التفاصيل</span>
      </span>
    </Link>
  );
}

type OrderData = { id: string; order_number: string | null; status: string; total: number; public_token: string | null; order_items: { product_name: string; quantity: number }[] };
export function OrderCard({ id, admin }: { id: string; admin?: boolean }) {
  const [o, setO] = useState<OrderData | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    createClient().from("orders").select("id,order_number,status,total,public_token,order_items(product_name,quantity)").eq("id", id).maybeSingle()
      .then(({ data }) => { if (on) setO((data as unknown as OrderData | null) ?? null); });
    return () => { on = false; };
  }, [id]);
  if (o === undefined) return <div className={shell + " h-20 animate-pulse"} />;
  if (o === null) return <div className={shell + " text-sm text-[#7D6335]"}>الطلب غير متاح</div>;
  const names = o.order_items.slice(0, 2).map((i) => `${i.product_name} ×${i.quantity}`).join("، ");
  const more = o.order_items.length > 2 ? ` +${o.order_items.length - 2}` : "";
  const href = admin ? `/admin/orders/${o.id}` : o.public_token ? `/order/${o.public_token}` : null;
  const body = (
    <>
      <span className={icon}><ShoppingBag size={22} /></span>
      <span className="min-w-0">
        <span className="block text-sm font-medium" dir="ltr">#{o.order_number}</span>
        <span className="block text-xs text-[#7D6335]">{STATUS_AR[o.status] ?? o.status}</span>
        <span className="block truncate text-xs">{names}{more}</span>
        <span className="block text-sm font-medium" dir="ltr">{fmtMoney(o.total)}</span>
      </span>
    </>
  );
  return href
    ? <Link href={href} className={shell + " flex items-center gap-3"}>{body}</Link>
    : <div className={shell + " flex items-center gap-3"}>{body}</div>;
}

type RcData = { receipt_number: string | null; total_amount: number; paid_amount: number; remaining_amount: number };
export function ReceiptCard({ id }: { id: string }) {
  const [r, setR] = useState<RcData | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    createClient().from("receipts").select("receipt_number,total_amount,paid_amount,remaining_amount").eq("id", id).maybeSingle()
      .then(({ data }) => { if (on) setR((data as RcData | null) ?? null); });
    return () => { on = false; };
  }, [id]);
  if (r === undefined) return <div className={shell + " h-16 animate-pulse"} />;
  if (r === null) return <div className={shell + " text-sm text-[#7D6335]"}>الوصل غير متاح</div>;
  return (
    <div className={shell + " flex items-center gap-3"}>
      <span className={icon}><Receipt size={22} /></span>
      <span className="min-w-0 text-sm">
        <span className="block font-medium" dir="ltr">#{r.receipt_number}</span>
        <span className="block text-xs text-[#7D6335]" dir="ltr">المبلغ {fmtMoney(r.total_amount)}</span>
        <span className="block text-xs text-[#7D6335]" dir="ltr">المدفوع {fmtMoney(r.paid_amount)}</span>
      </span>
    </div>
  );
}
