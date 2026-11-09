import ChatLink from "../../../../components/chat/ChatLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OrderDetails from "../../../../components/shop/OrderDetails";
import { createPublicClient } from "../../../../lib/shop/client";
import type { OrderJson } from "../../../../lib/shop/orders";

export const metadata: Metadata = {
  title: "تفاصيل الطلب",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (!UUID.test(token)) notFound();

  const sb = createPublicClient();
  const { data, error } = await sb.rpc("get_order_by_token", { p_token: token });

  if (error) {
    return (
      <div className="qm-wrap qo-page">
        <div className="qm-empty">
          <h2>تعذر تحميل الطلب</h2>
          <p>تحقق من اتصالك ثم أعد تحميل الصفحة.</p>
        </div>
      </div>
    );
  }
  if (!data) notFound();

  return (
    <div className="qm-wrap qo-page">
      <div className="qm-pagehead">
        <h1>{sp.placed === "1" ? "تم إنشاء الطلب" : "تفاصيل الطلب"}</h1>
      </div>
      <OrderDetails order={data as OrderJson} placed={sp.placed === "1"} />
      {(data as unknown as { id?: string }).id ? <div style={{ marginTop: 16 }}><ChatLink kind="order" orderId={(data as unknown as { id: string }).id} label="راسل المتجر بخصوص هذا الطلب" /></div> : null}
    </div>
  );
}
