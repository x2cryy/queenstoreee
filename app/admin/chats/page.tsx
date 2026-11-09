import { requireAnyPermission, getMyPermissions } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import AdminChats from "../../../components/chat/AdminChats";
import { CHAT_SELECT, type ChatRow } from "../../../lib/chat/types";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  await requireAnyPermission(["chats"]);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const perms = (await getMyPermissions()) as string[];
  const { data } = await sb.from("chats").select(CHAT_SELECT).order("last_message_at", { ascending: false, nullsFirst: false }).limit(200);
  const { chat } = await searchParams;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">المحادثات</h1>
      <AdminChats initial={(data ?? []) as unknown as ChatRow[]} meId={user?.id ?? ""}
        showPhone={perms.includes("customers") || perms.includes("orders")}
        initialChatId={chat && UUID.test(chat) ? chat : null} />
    </div>
  );
}
