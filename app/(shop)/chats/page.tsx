import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import ChatList from "../../../components/chat/ChatList";
import { CHAT_SELECT, type ChatRow } from "../../../lib/chat/types";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await sb.from("chats").select(CHAT_SELECT).order("last_message_at", { ascending: false, nullsFirst: false }).limit(200);
  const { error } = await searchParams;
  return (
    <main dir="rtl" className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#17140F]">محادثاتي</h1>
        <a href="/chats/new?kind=general" className="rounded-full bg-[#17140F] px-4 py-2 text-sm text-[#FBF7EF]">مراسلة المتجر</a>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">تعذّر بدء المحادثة. تأكد أن حسابك مسجّل كزبون.</p>}
      <ChatList role="customer" initial={(data ?? []) as unknown as ChatRow[]} hrefBase="/chats" />
    </main>
  );
}
