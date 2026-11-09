"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Store } from "lucide-react";
import { createClient } from "../../lib/supabase/browser";
import { CHAT_SELECT, fmtListTime, KIND_AR, type ChatRow, type Role } from "../../lib/chat/types";

type Props = { role: Role; initial: ChatRow[]; hrefBase?: string; onOpen?: (id: string) => void; activeId?: string | null };
type Filter = "all" | "unread" | "new" | "open" | "closed";
const FILTERS: [Filter, string][] = [["all", "الكل"], ["new", "جديدة"], ["unread", "غير مقروءة"], ["open", "نشطة"], ["closed", "مغلقة"]];

export default function ChatList({ role, initial, hrefBase, onOpen, activeId }: Props) {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ChatRow[]>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const refresh = useCallback(async () => {
    const { data } = await sb.from("chats").select(CHAT_SELECT).order("last_message_at", { ascending: false, nullsFirst: false }).limit(200);
    if (data) setRows(data as unknown as ChatRow[]);
  }, [sb]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let first = true;
    const ch = sb.channel(`chat-list-${role}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => { clearTimeout(t); t = setTimeout(refresh, 300); })
      .subscribe((s) => { if (s === "SUBSCRIBED") { if (!first) refresh(); first = false; } });
    return () => { clearTimeout(t); sb.removeChannel(ch); };
  }, [sb, role, refresh]);

  const unreadOf = (c: ChatRow) => (role === "admin" ? c.admin_unread_count : c.customer_unread_count);
  const nameOf = (c: ChatRow) => (role === "admin" ? c.customer?.full_name || "زبون" : "QUEEN STORE");
  const subjectOf = (c: ChatRow) => (c.order?.order_number ? `طلب #${c.order.order_number}` : c.product?.name ? c.product.name : KIND_AR[c.kind] ?? "");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (role === "admin" && !c.last_message_at) return false;
      if (filter === "unread" && unreadOf(c) === 0) return false;
      if (filter === "open" && c.status !== "open") return false;
      if (filter === "closed" && c.status === "open") return false;
      if (filter === "new" && Date.now() - new Date(c.created_at).getTime() > 86400000) return false;
      if (!s) return true;
      return [nameOf(c), subjectOf(c), c.last_message_preview ?? ""].some((x) => x.toLowerCase().includes(s));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, filter, role]);

  return (
    <div dir="rtl" className="flex min-h-0 flex-col gap-3 text-[#17140F]">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 text-[#B89B6A]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={role === "admin" ? "ابحث باسم الزبون أو رقم الطلب" : "ابحث في المحادثات"}
          className="w-full rounded-xl border border-[#B89B6A]/40 bg-white py-2.5 pe-9 ps-3 text-sm outline-none focus:border-[#B89B6A]" />
      </div>
      {role === "admin" && (
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs ${filter === k ? "bg-[#17140F] text-[#FBF7EF]" : "border border-[#B89B6A]/50 text-[#7D6335]"}`}>{label}</button>
          ))}
        </div>
      )}
      <div className="min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {list.length === 0 && <p className="py-10 text-center text-sm text-[#7D6335]">لا توجد محادثات</p>}
        {list.map((c) => {
          const un = unreadOf(c);
          const inner = (
            <>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#17140F] text-[#B89B6A]">
                {role === "admin" ? <span className="text-base font-semibold">{nameOf(c).slice(0, 1)}</span> : <Store size={20} />}
              </span>
              <span className="min-w-0 flex-1 text-start">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{nameOf(c)}</span>
                  <span className="shrink-0 text-[11px] text-[#7D6335]" dir="ltr">{mounted ? fmtListTime(c.last_message_at) : ""}</span>
                </span>
                <span className="block truncate text-xs text-[#B89B6A]">{subjectOf(c)}{c.status !== "open" ? " · مغلقة" : ""}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-[#7D6335]">{c.last_message_preview ?? "محادثة جديدة"}</span>
                  {un > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#B89B6A] px-1.5 text-[11px] font-semibold text-[#17140F]" dir="ltr">{un}</span>}
                </span>
              </span>
            </>
          );
          const cls = `flex w-full items-center gap-3 rounded-xl border bg-white p-3 ${activeId === c.id ? "border-[#B89B6A]" : "border-[#B89B6A]/25"}`;
          return onOpen
            ? <button key={c.id} onClick={() => onOpen(c.id)} className={cls}>{inner}</button>
            : <Link key={c.id} href={`${hrefBase}/${c.id}`} className={cls}>{inner}</Link>;
        })}
      </div>
    </div>
  );
}
