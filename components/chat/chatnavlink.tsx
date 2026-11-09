"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { createClient } from "../../lib/supabase/browser";

export default function ChatNavLink({ className = "" }: { className?: string }) {
  const sb = useMemo(() => createClient(), []);
  const [n, setN] = useState(0);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    let on = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!on) return;
      setAuthed(!!user);
      if (!user) { setN(0); return; }
      const { data } = await sb.from("chats").select("customer_unread_count");
      if (on) setN((data ?? []).reduce((a, c) => a + (c.customer_unread_count ?? 0), 0));
    };
    void load();
    const ch = sb.channel("chat-nav-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => { clearTimeout(t); t = setTimeout(load, 300); })
      .subscribe();
    return () => { on = false; clearTimeout(t); sb.removeChannel(ch); };
  }, [sb]);
  return (
    <a href={authed ? "/chats" : "/login?next=%2Fchats"} aria-label="محادثاتي" className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <MessageCircle size={20} />
      <span className="text-sm">محادثاتي</span>
      {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#B89B6A] px-1.5 text-[11px] font-semibold text-[#17140F]" dir="ltr">{n}</span>}
    </a>
  );
}
