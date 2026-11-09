import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import ChatRoom from "../../../../components/chat/ChatRoom";
import { CHAT_SELECT, KIND_AR, type ChatRow } from "../../../../lib/chat/types";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await sb.from("chats").select(CHAT_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as unknown as ChatRow;
  const subtitle = c.order?.order_number ? `طلب #${c.order.order_number}` : c.product?.name ? c.product.name : KIND_AR[c.kind] ?? "";
  return (
    <div className="fixed inset-0 z-50 bg-[#FBF7EF] md:static md:z-auto md:mx-auto md:my-6 md:h-[80dvh] md:max-w-3xl md:overflow-hidden md:rounded-2xl md:border md:border-[#B89B6A]/40">
      <ChatRoom chatId={id} role="customer" meId={user.id} folderUid={user.id} customerId={c.customer_id}
        title="QUEEN STORE" subtitle={subtitle} productId={c.product_id} closed={c.status !== "open"} backHref="/chats" />
    </div>
  );
}
