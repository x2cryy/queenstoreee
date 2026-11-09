import type { Metadata } from "next";
import CheckoutView from "../../../components/shop/CheckoutView";
import { getProfile, getUser } from "../../../lib/auth/session";
import { createPublicClient } from "../../../lib/shop/client";
import { getQiEnabled } from "../../../lib/shop/qi";

export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false } };
export const dynamic = "force-dynamic";

// للعرض التقديري فقط. الحساب الفعلي للتوصيل يتم داخل create_order على الخادم.
async function getDelivery(): Promise<{ fee: number; freeOver: number | null } | null> {
  try {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "delivery")
      .maybeSingle();
    if (error || !data) return null;
    const v = data.value as { fee?: unknown; free_over?: unknown } | null;
    if (!v || typeof v.fee !== "number") return null;
    return {
      fee: Math.max(0, Math.round(v.fee)),
      freeOver: typeof v.free_over === "number" ? v.free_over : null,
    };
  } catch {
    return null;
  }
}

export default async function CheckoutPage() {
  const user = await getUser();
  const profile = user ? await getProfile() : null;
  const delivery = await getDelivery();
  const qiEnabled = await getQiEnabled();
  return (
    <div className="qm-wrap qo-page">
      <div className="qm-pagehead">
        <h1>إتمام الطلب</h1>
      </div>
      <CheckoutView
        signedIn={!!user}
        defaults={{ fullName: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
        delivery={delivery}
        qiEnabled={qiEnabled}
      />
    </div>
  );
}
