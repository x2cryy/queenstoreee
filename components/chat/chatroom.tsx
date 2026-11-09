"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CheckCheck, ImageIcon, Loader2, Mic, Music, Package, Paperclip, Receipt, RotateCcw, Send, ShoppingBag, Square, X } from "lucide-react";
import { createClient } from "../../lib/supabase/browser";
import { fmtClock, fmtMoney, MSG_COLS, type ChatMessage, type MsgType, type Role } from "../../lib/chat/types";
import { audioExt, compressImage, IMG_TYPES, MAX_AUDIO, MAX_IMG, normAudio, signedUrl, uploadMedia } from "../../lib/chat/media";
import { OrderCard, ProductCard, ReceiptCard } from "./Cards";

const PAGE = 30;
type Props = {
  productId?: string | null;
  chatId: string; role: Role; meId: string; folderUid: string | null; customerId?: string | null;
  title: string; subtitle?: string; closed?: boolean; backHref?: string; onBack?: () => void; backClassName?: string;
};

function useSigned(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    if (path.startsWith("local:")) { setUrl(path.slice(6)); return; }
    let on = true;
    signedUrl(path).then((u) => on && setUrl(u)).catch(() => on && setUrl(null));
    return () => { on = false; };
  }, [path]);
  return url;
}
function Img({ path, onOpen }: { path: string; onOpen: (u: string) => void }) {
  const url = useSigned(path);
  if (!url) return <div className="h-40 w-52 animate-pulse rounded-lg bg-[#B89B6A]/20" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="صورة" onClick={() => onOpen(url)} className="max-h-72 w-auto max-w-full cursor-zoom-in rounded-lg object-cover" />;
}
function Voice({ path, secs }: { path: string; secs: number | null }) {
  const url = useSigned(path);
  return (
    <div className="w-60 max-w-full">
      {url ? <audio controls preload="metadata" src={url} className="h-10 w-full" /> : <div className="h-10 animate-pulse rounded bg-[#B89B6A]/20" />}
      {secs ? <div className="mt-0.5 text-[11px] opacity-70" dir="ltr">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</div> : null}
    </div>
  );
}

function Picker({ kind, role, customerId, onPick, onClose }: { kind: "product" | "order" | "receipt"; role: Role; customerId?: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const sb = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ id: string; a: string; b: string }[] | null>(null);
  useEffect(() => {
    let on = true;
    const t = setTimeout(async () => {
      const s = q.replace(/[%,()]/g, "").trim();
      let list: { id: string; a: string; b: string }[] = [];
      if (kind === "product") {
        const base = sb.from("products").select("id,name,price").limit(8);
        const { data } = s ? await base.ilike("name", `%${s}%`) : await base;
        list = (data ?? []).map((r) => ({ id: r.id, a: r.name, b: fmtMoney(r.price) }));
      } else if (kind === "order") {
        let base = sb.from("orders").select("id,order_number,total").order("created_at", { ascending: false }).limit(8);
        if (role === "admin" && customerId) base = base.eq("customer_id", customerId);
        const { data } = s ? await base.ilike("order_number", `%${s}%`) : await base;
        list = (data ?? []).map((r) => ({ id: r.id, a: `#${r.order_number}`, b: fmtMoney(r.total) }));
      } else {
        let base = sb.from("receipts").select("id,receipt_number,total_amount").order("created_at", { ascending: false }).limit(8);
        if (customerId) base = base.eq("customer_id", customerId);
        const { data } = s ? await base.ilike("receipt_number", `%${s}%`) : await base;
        list = (data ?? []).map((r) => ({ id: r.id, a: `#${r.receipt_number}`, b: fmtMoney(r.total_amount) }));
      }
      if (on) setRows(list);
    }, 250);
    return () => { on = false; clearTimeout(t); };
  }, [q, kind, role, customerId, sb]);
  const label = kind === "product" ? "منتج" : kind === "order" ? "طلب" : "وصل";
  return (
    <div className="mb-2 rounded-xl border border-[#B89B6A]/40 bg-[#FBF7EF] p-2">
      <div className="mb-2 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`ابحث عن ${label}`} className="min-w-0 flex-1 rounded-lg border border-[#B89B6A]/40 bg-white px-3 py-2 text-sm outline-none" />
        <button onClick={onClose} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full"><X size={18} /></button>
      </div>
      <div className="max-h-44 space-y-1 overflow-y-auto">
        {rows === null && <div className="p-2 text-sm text-[#7D6335]">جارٍ التحميل…</div>}
        {rows?.length === 0 && <div className="p-2 text-sm text-[#7D6335]">لا توجد نتائج</div>}
        {rows?.map((r) => (
          <button key={r.id} onClick={() => onPick(r.id)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-start text-sm">
            <span className="min-w-0 truncate">{r.a}</span><span className="shrink-0 text-[#7D6335]" dir="ltr">{r.b}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatRoom({ chatId, role, meId, folderUid, customerId, productId, title, subtitle, closed, backHref, onBack, backClassName }: Props) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<null | "product" | "order" | "receipt">(null);
  const [imgPrev, setImgPrev] = useState<{ blob: Blob; url: string } | null>(null);
  const [light, setLight] = useState<string | null>(null);
  const [canRec, setCanRec] = useState(false);
  const [rec, setRec] = useState<"idle" | "recording" | "review">("idle");
  const [secs, setSecs] = useState(0);
  const [voice, setVoice] = useState<{ blob: Blob; url: string; secs: number } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const keep = useRef<number | null>(null);
  const retry = useRef(new Map<string, () => void>());
  const typingCh = useRef<ReturnType<typeof sb.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const mr = useRef<MediaRecorder | null>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStart = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const audInput = useRef<HTMLInputElement>(null);
  const closedForMe = !!closed && role === "customer";

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMsgs((prev) => {
      const m = new Map(prev.map((x) => [x.id, x]));
      for (const x of incoming) m.set(x.id, { ...m.get(x.id), ...x, _state: undefined });
      return [...m.values()].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    });
  }, []);
  const refetchRecent = useCallback(async () => {
    const { data } = await sb.from("chat_messages").select(MSG_COLS).eq("chat_id", chatId).order("created_at", { ascending: false }).limit(PAGE);
    if (data) merge((data as ChatMessage[]).slice().reverse());
  }, [sb, chatId, merge]);
  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") sb.rpc("mark_chat_read", { p_chat_id: chatId }).then(() => {});
  }, [sb, chatId]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (keep.current !== null) { el.scrollTop += el.scrollHeight - keep.current; keep.current = null; }
    else if (stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, loading]);
  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await sb.from("chat_messages").select(MSG_COLS).eq("chat_id", chatId).order("created_at", { ascending: false }).limit(PAGE);
      if (!alive) return;
      if (error) setErr("تعذّر تحميل الرسائل");
      else { merge((data as ChatMessage[]).slice().reverse()); setHasMore((data?.length ?? 0) === PAGE); markRead(); }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [sb, chatId, merge, markRead]);

  useEffect(() => {
    let first = true;
    const ch = sb.channel(`chat-msgs-${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` }, (pl) => {
        const row = pl.new as ChatMessage;
        if (!row?.id) return;
        merge([row]);
        if (row.sender_type !== role) { setTyping(false); if (!row.is_read) markRead(); }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setOnline(true); if (!first) refetchRecent(); first = false; }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setOnline(false);
      });
    const goOn = () => { setOnline(true); refetchRecent(); };
    const goOff = () => setOnline(false);
    const vis = () => { if (document.visibilityState === "visible") { markRead(); refetchRecent(); } };
    window.addEventListener("online", goOn); window.addEventListener("offline", goOff);
    document.addEventListener("visibilitychange", vis);
    return () => {
      sb.removeChannel(ch);
      window.removeEventListener("online", goOn); window.removeEventListener("offline", goOff);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [sb, chatId, role, merge, markRead, refetchRecent]);

  useEffect(() => {
    let cancelled = false;
    let ch: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      await sb.realtime.setAuth();
      if (cancelled) return;
      ch = sb.channel(`typing:${chatId}`, { config: { private: true, broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.role && payload.role !== role) {
            setTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(false), 3500);
          }
        }).subscribe();
      typingCh.current = ch;
    })();
    return () => { cancelled = true; if (ch) sb.removeChannel(ch); typingCh.current = null; };
  }, [sb, chatId, role]);

  useEffect(() => {
    setCanRec(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
    return () => {
      if (recTimer.current) clearInterval(recTimer.current);
      mr.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const run = useCallback(async (id: string, build: () => Promise<Record<string, unknown>>) => {
    setMsgs((p) => p.map((x) => (x.id === id ? { ...x, _state: "sending" } : x)));
    try {
      const fields = await build();
      const { data, error } = await sb.from("chat_messages")
        .insert({ id, chat_id: chatId, sender_type: role, sender_id: meId, is_read: false, ...fields })
        .select(MSG_COLS).single();
      if (error && error.code !== "23505") throw error;
      if (data) merge([data as ChatMessage]); else refetchRecent();
      retry.current.delete(id);
    } catch {
      setMsgs((p) => p.map((x) => (x.id === id ? { ...x, _state: "failed" } : x)));
    }
  }, [sb, chatId, role, meId, merge, refetchRecent]);

  const queue = useCallback((local: Partial<ChatMessage> & { message_type: MsgType }, build: () => Promise<Record<string, unknown>>) => {
    const id = crypto.randomUUID();
    retry.current.set(id, () => { void run(id, build); });
    stick.current = true;
    setMsgs((p) => [...p, {
      id, chat_id: chatId, sender_type: role, sender_id: meId, body: null, media_path: null,
      media_duration_seconds: null, product_id: null, order_id: null, receipt_id: null,
      is_read: false, read_at: null, created_at: new Date().toISOString(), _state: "sending", ...local,
    }]);
    void run(id, build);
  }, [run, chatId, role, meId]);

  const loadOlder = async () => {
    const first = msgs[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    keep.current = listRef.current?.scrollHeight ?? null;
    const { data, error } = await sb.from("chat_messages").select(MSG_COLS).eq("chat_id", chatId).lt("created_at", first.created_at).order("created_at", { ascending: false }).limit(PAGE);
    if (error) { keep.current = null; setErr("تعذّر تحميل الرسائل القديمة"); }
    else { setHasMore((data?.length ?? 0) === PAGE); merge((data as ChatMessage[]).slice().reverse()); }
    setLoadingOlder(false);
  };

  const sendText = () => {
    const body = text.trim();
    if (!body || closedForMe) return;
    if (body.length > 4000) { setErr("الرسالة طويلة جداً (الحد 4000 حرف)"); return; }
    setText(""); setErr(null);
    if (taRef.current) taRef.current.style.height = "auto";
    queue({ message_type: "text", body }, async () => ({ message_type: "text", body }));
  };
  const onType = (v: string) => {
    setText(v);
    const el = taRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 128) + "px"; }
    const now = Date.now();
    if (v && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      typingCh.current?.send({ type: "broadcast", event: "typing", payload: { role } });
    }
  };

  const pickImage = async (f: File | undefined) => {
    setMenu(false);
    if (!f) return;
    if (!IMG_TYPES.includes(f.type)) { setErr("نوع الصورة غير مدعوم (JPEG أو PNG أو WebP فقط)"); return; }
    if (f.size > MAX_IMG) { setErr("حجم الصورة كبير (الحد 8 ميغابايت)"); return; }
    try { const blob = await compressImage(f); setImgPrev({ blob, url: URL.createObjectURL(blob) }); setErr(null); }
    catch { setErr("تعذّر معالجة الصورة"); }
  };
  const sendImage = () => {
    if (!imgPrev) return;
    if (!folderUid) { setErr("تعذّر تحديد مجلد الرفع"); return; }
    const { blob, url } = imgPrev;
    setImgPrev(null);
    let path: string | null = null;
    queue({ message_type: "image", media_path: "local:" + url }, async () => {
      path ??= await uploadMedia(folderUid, chatId, blob, "image/jpeg", "jpg");
      return { message_type: "image", media_path: path };
    });
  };

  const sendVoiceBlob = (blob: Blob, mime: string, dur: number) => {
    if (!folderUid) { setErr("تعذّر تحديد مجلد الرفع"); return; }
    const url = URL.createObjectURL(blob);
    let path: string | null = null;
    queue({ message_type: "voice", media_path: "local:" + url, media_duration_seconds: dur }, async () => {
      path ??= await uploadMedia(folderUid, chatId, blob, mime, audioExt(mime));
      return { message_type: "voice", media_path: path, media_duration_seconds: dur };
    });
  };
  const startRec = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recTimer.current) clearInterval(recTimer.current);
        const type = normAudio(r.mimeType || "audio/webm") ?? "audio/webm";
        const blob = new Blob(chunks, { type });
        const d = Math.max(1, Math.round((Date.now() - recStart.current) / 1000));
        setVoice({ blob, url: URL.createObjectURL(blob), secs: d });
        setRec("review");
      };
      mr.current = r; recStart.current = Date.now(); setSecs(0); r.start(); setRec("recording");
      recTimer.current = setInterval(() => {
        const s = Math.round((Date.now() - recStart.current) / 1000);
        setSecs(s);
        if (s >= 300) r.stop();
      }, 500);
    } catch { setErr("تعذّر الوصول إلى المايكروفون. اسمح بالإذن أو أرفق ملفاً صوتياً."); }
  };
  const stopRec = () => mr.current?.stop();
  const discardVoice = () => { if (voice) URL.revokeObjectURL(voice.url); setVoice(null); setRec("idle"); };
  const sendVoice = () => {
    if (!voice) return;
    const mime = normAudio(voice.blob.type) ?? "audio/webm";
    sendVoiceBlob(voice.blob, mime, voice.secs);
    setVoice(null); setRec("idle");
  };
  const pickAudio = (f: File | undefined) => {
    setMenu(false);
    if (!f) return;
    const mime = normAudio(f.type);
    if (!mime) { setErr("نوع الملف الصوتي غير مدعوم"); return; }
    if (f.size > MAX_AUDIO) { setErr("حجم الملف الصوتي كبير (الحد 10 ميغابايت)"); return; }
    const a = new Audio(URL.createObjectURL(f));
    a.onloadedmetadata = () => {
      const d = Math.round(a.duration);
      if (!isFinite(d) || d < 1) { setErr("تعذّر قراءة مدة الملف الصوتي"); return; }
      if (d > 300) { setErr("مدة الملف الصوتي أطول من 5 دقائق"); return; }
      sendVoiceBlob(f, mime, d);
    };
    a.onerror = () => setErr("تعذّر قراءة الملف الصوتي");
  };

  const share = (type: "product" | "order" | "receipt", id: string) => {
    setPicker(null);
    const col = type === "product" ? "product_id" : type === "order" ? "order_id" : "receipt_id";
    queue({ message_type: type, [col]: id } as Partial<ChatMessage> & { message_type: MsgType }, async () => ({ message_type: type, [col]: id }));
  };

  const back = () => { if (onBack) onBack(); else if (backHref) router.push(backHref); };
  const hasBack = !!(onBack || backHref);

  const autoCard = useRef(false);
  useEffect(() => {
    if (autoCard.current || loading || !productId || role !== "customer" || closedForMe) return;
    const t = setTimeout(() => {
      if (autoCard.current) return;
      autoCard.current = true;
      if (!msgs.some((m) => m.product_id === productId)) share("product", productId);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, productId, role, closedForMe, msgs]);

  return (
    <div dir="rtl" className="flex h-full min-h-0 w-full flex-col bg-[#FBF7EF] text-[#17140F]">
      <header className="flex items-center gap-3 border-b border-[#B89B6A]/30 bg-white px-3 py-2.5">
        {hasBack && <button onClick={back} aria-label="رجوع" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#FBF7EF] ${backClassName ?? ""}`}><ArrowRight size={20} /></button>}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title}</div>
          <div className="truncate text-xs text-[#7D6335]">{typing ? "يكتب الآن…" : subtitle}</div>
        </div>
      </header>
      {!online && <div className="bg-[#17140F] px-3 py-1.5 text-center text-xs text-[#FBF7EF]">انقطع الاتصال، جارٍ إعادة الاتصال…</div>}

      <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-3">
        {hasMore && <button onClick={loadOlder} disabled={loadingOlder} className="mx-auto block rounded-full border border-[#B89B6A]/50 px-4 py-1.5 text-xs text-[#7D6335]">{loadingOlder ? "جارٍ التحميل…" : "تحميل الرسائل الأقدم"}</button>}
        {loading && <div className="flex justify-center py-8 text-[#B89B6A]"><Loader2 className="animate-spin" /></div>}
        {!loading && msgs.length === 0 && <p className="py-10 text-center text-sm text-[#7D6335]">لا توجد رسائل بعد. ابدأ المحادثة.</p>}
        {msgs.map((m) => {
          const mine = m.sender_type === role;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[82%] min-w-0 rounded-2xl px-3 py-2 ${mine ? "bg-[#17140F] text-[#FBF7EF]" : "border border-[#B89B6A]/40 bg-white"}`}>
                {m.message_type === "text" && <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.body}</p>}
                {m.message_type === "image" && m.media_path && <Img path={m.media_path} onOpen={setLight} />}
                {m.message_type === "voice" && m.media_path && <Voice path={m.media_path} secs={m.media_duration_seconds} />}
                {m.message_type === "product" && m.product_id && <ProductCard id={m.product_id} />}
                {m.message_type === "order" && m.order_id && <OrderCard id={m.order_id} admin={role === "admin"} />}
                {m.message_type === "receipt" && m.receipt_id && <ReceiptCard id={m.receipt_id} />}
                <div className="mt-1 flex items-center gap-1.5 text-[11px] opacity-70" dir="ltr">
                  <span>{fmtClock(m.created_at)}</span>
                  {mine && (m._state === "sending" ? <Loader2 size={12} className="animate-spin" />
                    : m._state === "failed" ? null
                    : m.is_read ? <CheckCheck size={14} className="text-[#B89B6A]" /> : <Check size={14} />)}
                </div>
                {m._state === "failed" && (
                  <button onClick={() => retry.current.get(m.id)?.()} className="mt-1 flex items-center gap-1 text-xs text-red-400"><RotateCcw size={12} /> فشل الإرسال، أعد المحاولة</button>
                )}
              </div>
            </div>
          );
        })}
        {typing && <div className="text-xs text-[#7D6335]">يكتب الآن…</div>}
      </div>

      <div className="border-t border-[#B89B6A]/30 bg-white p-2">
        {err && <div className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><span>{err}</span><button onClick={() => setErr(null)} aria-label="إغلاق"><X size={16} /></button></div>}
        {closedForMe ? <p className="py-2 text-center text-sm text-[#7D6335]">هذه المحادثة مغلقة. يمكنك بدء محادثة جديدة من صفحة المحادثات.</p> : (
          <>
            {productId && role === "customer" && !text && (
              <div className="mb-2 flex flex-wrap gap-2">
                {["هل هذا المنتج متوفر؟", "كم سعره؟", "هل تتوفر ألوان أو مقاسات أخرى؟", "أريد تفاصيل أكثر عنه"].map((q) => (
                  <button key={q} type="button" onClick={() => { setText(q); taRef.current?.focus(); }} className="rounded-full border border-[#B89B6A] px-3 py-1 text-xs text-[#7D6335]">{q}</button>
                ))}
              </div>
            )}
            {picker && <Picker kind={picker} role={role} customerId={customerId} onPick={(id) => share(picker, id)} onClose={() => setPicker(null)} />}
            {imgPrev && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#FBF7EF] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPrev.url} alt="معاينة" className="h-20 w-20 rounded-lg object-cover" />
                <div className="flex-1 text-sm text-[#7D6335]">معاينة الصورة قبل الإرسال</div>
                <button onClick={() => setImgPrev(null)} className="rounded-full px-3 py-1.5 text-sm">إلغاء</button>
                <button onClick={sendImage} className="rounded-full bg-[#17140F] px-4 py-1.5 text-sm text-[#FBF7EF]">إرسال</button>
              </div>
            )}
            {rec === "recording" && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#FBF7EF] p-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="flex-1 text-sm" dir="ltr">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
                <button onClick={stopRec} className="flex items-center gap-1 rounded-full bg-[#17140F] px-4 py-1.5 text-sm text-[#FBF7EF]"><Square size={14} /> إيقاف</button>
              </div>
            )}
            {rec === "review" && voice && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#FBF7EF] p-2">
                <audio controls src={voice.url} className="h-10 min-w-0 flex-1" />
                <button onClick={discardVoice} className="rounded-full px-2 py-1.5 text-sm">حذف</button>
                <button onClick={sendVoice} className="rounded-full bg-[#17140F] px-4 py-1.5 text-sm text-[#FBF7EF]">إرسال</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="relative">
                <button onClick={() => setMenu((v) => !v)} aria-label="إرفاق" className="grid h-10 w-10 place-items-center rounded-full text-[#7D6335] hover:bg-[#FBF7EF]"><Paperclip size={20} /></button>
                {menu && (
                  <div className="absolute bottom-12 start-0 z-10 w-44 rounded-xl border border-[#B89B6A]/40 bg-white p-1 shadow-lg">
                    <button onClick={() => imgInput.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#FBF7EF]"><ImageIcon size={16} /> صورة</button>
                    {!canRec && <button onClick={() => audInput.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#FBF7EF]"><Music size={16} /> ملف صوتي</button>}
                    <button onClick={() => { setMenu(false); setPicker("product"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#FBF7EF]"><Package size={16} /> منتج</button>
                    <button onClick={() => { setMenu(false); setPicker("order"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#FBF7EF]"><ShoppingBag size={16} /> طلب</button>
                    {role === "admin" && <button onClick={() => { setMenu(false); setPicker("receipt"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#FBF7EF]"><Receipt size={16} /> وصل</button>}
                  </div>
                )}
              </div>
              <input ref={imgInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }} />
              <input ref={audInput} type="file" accept="audio/*" hidden onChange={(e) => { pickAudio(e.target.files?.[0]); e.target.value = ""; }} />
              <textarea ref={taRef} value={text} rows={1} onChange={(e) => onType(e.target.value)} placeholder="اكتب رسالة"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); sendText(); } }}
                className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-[#B89B6A]/40 bg-[#FBF7EF] px-4 py-2.5 text-[15px] outline-none focus:border-[#B89B6A]" />
              {text.trim() || !canRec ? (
                <button onClick={sendText} disabled={!text.trim()} aria-label="إرسال" className="grid h-10 w-10 place-items-center rounded-full bg-[#17140F] text-[#FBF7EF] disabled:opacity-40"><Send size={18} className="-scale-x-100" /></button>
              ) : (
                <button onClick={startRec} disabled={rec !== "idle"} aria-label="تسجيل صوتي" className="grid h-10 w-10 place-items-center rounded-full bg-[#17140F] text-[#FBF7EF] disabled:opacity-40"><Mic size={18} /></button>
              )}
            </div>
          </>
        )}
      </div>

      {light && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLight(null)}>
          <button className="absolute top-4 end-4 text-white" aria-label="إغلاق"><X size={28} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={light} alt="صورة" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
