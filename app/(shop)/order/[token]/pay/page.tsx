import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../../lib/auth/session";
import { createClient } from "../../../../../lib/supabase/server";
import { formatPrice } from "../../../../../lib/shop/format";
import { formatOrderDate } from "../../../../../lib/shop/orders";
import { QI_DEFAULT_STEPS } from "../../../../../lib/shop/qi";
import QiTransfer from "../../../../../components/shop/QiTransfer";

export const metadata: Metadata = { title: "إكمال الدفع", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ord = { id: string; order_number: string; total: number; payment_status: string; status: string };
type Pay = { id: string; status: string; provider_reference: string | null; reject_reason: string | null; submitted_at: string | null };
type Info = { recipient_name: string; card_number: string; steps: string[] } | null;

function Box({ title, text, token }: { title: string; text: string; token: string }) {
  return (
    <div className="qm-empty">
      <h2>{title}</h2>
      <p>{text}</p>
      <Link href={`/order/${token}`} className="qm-btn qm-btn-gold" style={{ marginTop: 18 }}>
        تفاصيل الطلب
      </Link>
    </div>
  );
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const user = await requireUser(`/order/${token}/pay`);
  const sb = await createClient();

  const oRes = await sb
    .from("orders")
    .select("id, order_number, total, payment_status, status")
    .eq("public_token", token)
    .eq("user_id", user.id)
    .maybeSingle();
  const o = oRes.data as unknown as Ord | null;
  if (!o) notFound();

  const pRes = await sb
    .from("payments")
    .select("id, status, provider_reference, reject_reason, submitted_at")
    .eq("order_id", o.id)
    .eq("method", "qi_card")
    .order("created_at", { ascending: false });
  const last = ((pRes.data ?? []) as unknown as Pay[])[0] ?? null;

  let body: React.ReactNode;
  if (o.payment_status === "paid") {
    body = <Box token={token} title="تم تأكيد الدفع" text="استلمنا دفعة هذا الطلب. شكراً لك." />;
  } else if (o.status === "cancelled" || o.status === "returned") {
    body = <Box token={token} title="الطلب مغلق" text="هذا الطلب ملغي أو مرجّع، فما يحتاج دفع." />;
  } else if (last?.status === "pending") {
    body = (
      <Box
        token={token}
        title="بانتظار مراجعة الإدارة"
        text={`وصل إثبات التحويل${last.submitted_at ? ` بتاريخ ${formatOrderDate(last.submitted_at)}` : ""}${last.provider_reference ? `، المرجع: ${last.provider_reference}` : ""}. نخبرك أول ما تتم المراجعة.`}
      />
    );
  } else {
    const iRes = await sb.rpc("get_qi_transfer_info", { p_order_id: o.id });
    const info = iRes.data as unknown as Info;
    if (!info) {
      body = <Box token={token} title="الطريقة غير متاحة" text="التحويل عبر Qi Card غير مفعّل حالياً. تواصل مع المتجر." />;
    } else {
      body = (
        <QiTransfer
          orderId={o.id}
          userId={user.id}
          recipientName={info.recipient_name}
          cardNumber={info.card_number}
          amountText={formatPrice(Number(o.total) || 0)}
          steps={Array.isArray(info.steps) && info.steps.length > 0 ? info.steps : QI_DEFAULT_STEPS}
          lastReject={last?.status === "failed" ? last.reject_reason : null}
        />
      );
    }
  }

  return (
    <div className="qm-wrap qo-page">
      <div className="qm-pagehead">
        <h1>إكمال الدفع</h1>
        <p className="qo-hint" dir="ltr">{o.order_number}</p>
      </div>
      {body}
    </div>
  );
}
