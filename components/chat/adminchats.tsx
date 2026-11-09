"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock, LockOpen, UserRound } from "lucide-react";
import { createClient } from "../../lib/supabase/browser";
import { CHAT_SELECT, fmtMoney, KIND_AR, STATUS_AR, type ChatRow } from "../../lib/chat/types";
import ChatList from "./ChatList";
import ChatRoom from "./ChatRoom";

type Props = { initial: ChatRow[]; meId: string; showPhone: boolean; initialChatId: string | null };

function CustomerPanel({ chat, showPhone }: { chat: ChatRow; showPhone: boolean }) {
  const sb = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<{ id: string; order_number: string | null; status: string; total: number }[] | null>(null);
  const [prods, setProds] = useState<{ id: string; name: string; slug: string }[] | null>(null);
  useEffect(() => {
    let on = true;
    (async () => {
      const o = await sb.from("orders").select("id,order_number,status,total").eq("customer_id", chat.customer_id).order("created_at", { ascending: false }).limit(5);
      const m = await sb.from("chat_messages").select("product_id").eq("chat_id", chat.id).not("product_id", "is", null).limit(50);
      const ids = [...new Set([...(m.data ?? []).map((x) => x.product_id as string), ...(chat.product_id ? [chat.product_id] : [])])].slice(0, 8);
      const p = ids.length ? await sb.from("products").select("id,name,slug").in("id", ids) : null;
      if (on) { setOrders(o.data ?? []); setProds(p?.data ?? []); }
    })();
    return () => { on = false; };
  }, [sb, chat.id, chat.customer_id, chat.product_id]);
  const phone = showPhone ? chat.customer?.phone : null;
  return (
    <div className="max-h-52 space-y-3 overflow-y-auto border-b border-[#B89B6A]/30 bg-[#FBF7EF] px-3 py-3 text-sm text-[#17140F]">
      <div>
        <div className="font-medium">{chat.customer?.full_name || "زبون"}</div>
        {phone ? <a href={`tel:${phone}`} className="text-[#7D6335]" dir="ltr">{phone}</a> : null}
      </div>
      <div>
        <div className="mb-1 text-xs text-[#7D6335]">الطلبات المرتبطة</div>
        {orders === null ? <div className="h-8 animate-pulse rounded bg-[#B89B6A]/20" /> : orders.length === 0 ? <div className="text-xs text-[#7D6335]">لا توجد طلبات</div> : (
          <div className="space-y-1">
            {orders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5">
                <span dir="ltr">#{o.order_number}</span>
                <span className="text-xs text-[#7D6335]">{STATUS_AR[o.status] ?? o.status}</span>
                <span className="text-xs" dir="ltr">{fmtMoney(o.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 text-xs text-[#7D6335]">المنتجات التي استفسر عنها</div>
        {prods === null ? <div className="h-8 animate-pulse rounded bg-[#B89B6A]/20" /> : prods.length === 0 ? <div className="text-xs text-[#7D6335]">لا يوجد</div> : (
          <div className="flex flex-wrap gap-1.5">
            {prods.map((p) => <Link key={p.id} href={`/product/${p.slug}`} className="max-w-full truncate rounded-full bg-white px-3 py-1 text-xs">{p.name}</Link>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminChats({ initial, meId, showPhone, initialChatId }: Props) {
  const sb = useMemo(() => createClient(), []);
  const [selId, setSelId] = useState<string | null>(initialChatId);
  const [chat, setChat] = useState<ChatRow | null>(null);
  const [info, setInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!selId) { setChat(null); return; }
    let on = true;
    sb.from("chats").select(CHAT_SELECT).eq("id", selId).maybeSingle().then(({ data }) => { if (on) setChat((data as unknown as ChatRow) ?? null); });
    return () => { on = false; };
  }, [sb, selId]);

  const open = (id: string | null) => {
    setSelId(id); setInfo(false); setErr(null);
    window.history.replaceState(null, "", id ? `/admin/chats?chat=${id}` : "/admin/chats");
  };
  const toggle = async () => {
    if (!chat) return;
    setBusy(true); setErr(null);
    const next = chat.status === "open" ? "closed" : "open";
    const { error } = await sb.from("chats").update({ status: next, updated_at: new Date().toISOString() }).eq("id", chat.id);
    if (error) setErr("تعذّر تغيير حالة المحادثة"); else setChat({ ...chat, status: next });
    setBusy(false);
  };

  const subtitle = chat ? (chat.order?.order_number ? `طلب #${chat.order.order_number}` : chat.product?.name ? chat.product.name : KIND_AR[chat.kind] ?? "") : "";
  const btn = "flex items-center gap-1.5 rounded-full border border-[#B89B6A]/50 px-3 py-1.5 text-xs text-[#7D6335] disabled:opacity-50";

  return (
    <div dir="rtl" className="grid h-[78dvh] min-h-[480px] grid-cols-1 gap-3 md:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="h-full min-h-0 overflow-hidden [&>div]:h-full">
        <ChatList role="admin" initial={initial} onOpen={open} activeId={selId} />
      </div>
      <div className={selId
        ? "fixed inset-0 z-[70] flex flex-col bg-[#FBF7EF] md:static md:z-auto md:overflow-hidden md:rounded-2xl md:border md:border-[#B89B6A]/40"
        : "hidden md:flex md:items-center md:justify-center md:rounded-2xl md:border md:border-[#B89B6A]/40 md:bg-white"}>
        {!selId && <p className="text-sm text-[#7D6335]">اختر محادثة للبدء</p>}
        {selId && chat === null && <div className="m-auto h-8 w-8 animate-pulse rounded-full bg-[#B89B6A]/40" />}
        {chat && (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-[#B89B6A]/30 bg-white px-3 py-2">
              <button onClick={() => setInfo((v) => !v)} className={btn}><UserRound size={14} /> بيانات الزبون</button>
              <button onClick={toggle} disabled={busy} className={btn}>
                {chat.status === "open" ? <><Lock size={14} /> إغلاق المحادثة</> : <><LockOpen size={14} /> إعادة فتح</>}
              </button>
              {chat.status !== "open" && <span className="text-xs text-[#7D6335]">مغلقة</span>}
              {err && <span className="text-xs text-red-600">{err}</span>}
            </div>
            {info && <CustomerPanel chat={chat} showPhone={showPhone} />}
            <div className="min-h-0 flex-1">
              <ChatRoom key={chat.id} chatId={chat.id} role="admin" meId={meId} folderUid={chat.customer?.user_id ?? null}
                customerId={chat.customer_id} title={chat.customer?.full_name || "زبون"} subtitle={subtitle}
                onBack={() => open(null)} backClassName="md:hidden" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
