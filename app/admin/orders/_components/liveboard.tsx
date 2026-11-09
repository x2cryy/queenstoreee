"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { formatDateTime, formatMoney } from "../../../../lib/admin/format";
import type { LiveOrder } from "../../../../lib/admin/live-orders";
import { refreshLiveOrders } from "../live/actions";

const POLL_MS = 8000;
const SOUND_KEY = "qs-live-sound";

const GROUPS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: "all", label: "الكل", statuses: null },
  { key: "new", label: "جديدة", statuses: ["new", "pending_confirmation"] },
  { key: "processing", label: "قيد التجهيز", statuses: ["confirmed", "preparing"] },
  { key: "ready", label: "جاهزة وقيد التوصيل", statuses: ["ready", "out_for_delivery"] },
];

type Conn = "live" | "retry" | "offline";

const clock = () =>
  new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function beep(ctx: AudioContext) {
  const t = ctx.currentTime;
  [660, 880].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const s = t + i * 0.22;
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.4, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(s);
    o.stop(s + 0.22);
  });
}

function findScroller(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null;
  while (n) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
    n = n.parentElement;
  }
  return null;
}
const offsetOf = (s: HTMLElement | null) => (s ? s.scrollTop : window.scrollY);
const heightOf = (s: HTMLElement | null) =>
  s ? s.scrollHeight : document.documentElement.scrollHeight;

export function LiveBoard({ initial, initialFailed }: { initial: LiveOrder[]; initialFailed: boolean }) {
  const [orders, setOrders] = useState<LiveOrder[]>(initial);
  const [loaded, setLoaded] = useState(!initialFailed);
  const [conn, setConn] = useState<Conn>(initialFailed ? "retry" : "live");
  const [updated, setUpdated] = useState("");
  const [group, setGroup] = useState("all");
  const [fresh, setFresh] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [wantSound, setWantSound] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [soundNote, setSoundNote] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const wantRef = useRef(false);
  const unlockedRef = useRef(false);
  const seen = useRef<Set<string>>(new Set(initial.map((o) => o.id)));
  const primed = useRef(!initialFailed);
  const busy = useRef(false);
  const fails = useRef(0);
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    wantRef.current = wantSound;
  }, [wantSound]);

  const unlock = useCallback(async (): Promise<boolean> => {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctxRef.current) ctxRef.current = new AC();
      const c = ctxRef.current;
      await c.resume();
      const ok = (c.state as string) === "running";
      unlockedRef.current = ok;
      setUnlocked(ok);
      return ok;
    } catch {
      unlockedRef.current = false;
      setUnlocked(false);
      return false;
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "on") setWantSound(true);
    } catch {}
    const onDown = () => {
      if (wantRef.current && !unlockedRef.current) void unlock();
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [unlock]);

  const apply = useCallback((list: LiveOrder[]) => {
    const sorted = [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setLoaded(true);
    setUpdated(clock());
    if (!primed.current) {
      primed.current = true;
      sorted.forEach((o) => seen.current.add(o.id));
      setOrders(sorted);
      return;
    }
    const added = sorted.filter((o) => !seen.current.has(o.id));
    sorted.forEach((o) => seen.current.add(o.id));
    if (added.length > 0) {
      const sc = findScroller(rootRef.current);
      if (offsetOf(sc) > 120) {
        anchor.current = heightOf(sc);
        setPending((n) => n + added.length);
      } else {
        setPending(0);
      }
      const ids = added.map((o) => o.id);
      setFresh((p) => [...p, ...ids]);
      setTimeout(() => setFresh((p) => p.filter((id) => !ids.includes(id))), 8000);
      if (wantRef.current && unlockedRef.current && ctxRef.current) {
        try {
          beep(ctxRef.current);
        } catch {}
      }
    }
    setOrders(sorted);
  }, []);

  useLayoutEffect(() => {
    if (anchor.current === null) return;
    const sc = findScroller(rootRef.current);
    const delta = heightOf(sc) - anchor.current;
    anchor.current = null;
    if (delta > 0) {
      if (sc) sc.scrollTop += delta;
      else window.scrollBy(0, delta);
    }
  }, [orders]);

  const poll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (navigator.onLine === false) throw new Error("offline");
      const res = await refreshLiveOrders();
      if (!res.ok) throw new Error("fetch");
      fails.current = 0;
      setConn("live");
      apply(res.orders);
    } catch {
      fails.current += 1;
      if (navigator.onLine === false) setConn("offline");
      else if (fails.current >= 2) setConn("retry");
    } finally {
      busy.current = false;
    }
  }, [apply]);

  useEffect(() => {
    if (!initialFailed) apply(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (initialFailed) void poll();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const onOnline = () => void poll();
    const onOffline = () => setConn("offline");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll]);

  function save(v: "on" | "off") {
    try {
      localStorage.setItem(SOUND_KEY, v);
    } catch {}
  }

  async function toggleSound() {
    setSoundNote("");
    if (wantSound) {
      setWantSound(false);
      save("off");
      return;
    }
    setWantSound(true);
    save("on");
    const ok = await unlock();
    if (ok && ctxRef.current) beep(ctxRef.current);
    else setSoundNote("منع المتصفح تشغيل الصوت. المس الصفحة مرة أخرى لتفعيله.");
  }

  async function testSound() {
    const ok = await unlock();
    if (ok && ctxRef.current) {
      setSoundNote("");
      beep(ctxRef.current);
    } else {
      setSoundNote("منع المتصفح تشغيل الصوت. تأكد من أن الجهاز غير صامت ثم أعد المحاولة.");
    }
  }

  function showNew() {
    setPending(0);
    const sc = findScroller(rootRef.current);
    if (sc) sc.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const g = GROUPS.find((x) => x.key === group) ?? GROUPS[0];
  const st = g.statuses;
  const shown = st ? orders.filter((o) => st.includes(o.status)) : orders;

  const sum = GROUPS.slice(1).map((x) => {
    const list = orders.filter((o) => (x.statuses ?? []).includes(o.status));
    return { key: x.key, label: x.label, waiting: list.length, today: list.filter((o) => o.is_today).length };
  });

  const connText =
    conn === "live"
      ? "متصل" + (updated ? " — آخر تحديث " + updated : "")
      : conn === "offline"
        ? "لا يوجد اتصال بالإنترنت"
        : "تعذر التحديث، جارٍ إعادة المحاولة";
  const dot =
    conn === "live"
      ? "var(--c-ok, #1F7A4D)"
      : conn === "offline"
        ? "var(--c-bad, #B91C1C)"
        : "var(--c-warn, #B7791F)";
  const soundLabel = !wantSound ? "الصوت مكتوم" : unlocked ? "الصوت مفعّل" : "اضغط لتفعيل الصوت";

  return (
    <div ref={rootRef} style={{ overflowAnchor: "none", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span
          role="status"
          aria-live="polite"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}
        >
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }}
          />
          {connText}
        </span>
        <button type="button" className="ds-btn" onClick={() => void poll()}>
          <RefreshCw size={16} /> تحديث الآن
        </button>
        <button
          type="button"
          className={wantSound ? "ds-btn ds-btn-gold" : "ds-btn"}
          onClick={toggleSound}
        >
          {wantSound ? <Volume2 size={16} /> : <VolumeX size={16} />} {soundLabel}
        </button>
        <button type="button" className="ds-btn" onClick={testSound}>
          تجربة الصوت
        </button>
      </div>

      <p className="ds-desc" style={{ margin: 0 }}>
        {soundNote ||
          "النغمة: تنبيه قصير مدمج. يعمل الصوت والصفحة مفتوحة فقط، ويحتاج لمسة تفعيل بعد كل فتح للصفحة."}
      </p>

      {conn !== "live" && loaded ? (
        <p role="alert" className="ds-desc" style={{ margin: 0, color: "var(--c-bad, #B91C1C)" }}>
          قد تكون هناك طلبات جديدة لم تصل بعد، وستُجلب تلقائيًا عند عودة الاتصال.
        </p>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {sum.map((x) => (
          <div key={x.key} className="ds-kpi">
            <span className="ds-kpi-label">{x.label}</span>
            <span className="ds-kpi-value">{x.waiting}</span>
            <span className="ds-kpi-hint">منها اليوم: {x.today}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="تصفية الحالة">
        {GROUPS.map((x) => (
          <button
            key={x.key}
            type="button"
            className={x.key === group ? "ds-btn ds-btn-gold" : "ds-btn"}
            onClick={() => setGroup(x.key)}
          >
            {x.label}
          </button>
        ))}
      </div>

      {pending > 0 ? (
        <button
          type="button"
          className="ds-btn ds-btn-gold"
          style={{ position: "sticky", top: 8, zIndex: 5, justifySelf: "center" }}
          onClick={showNew}
        >
          وصلت طلبات جديدة ({pending}) — عرض
        </button>
      ) : null}

      {!loaded ? (
        <div role="alert" className="ds-empty">
          تعذر تحميل الطلبات.{" "}
          <button type="button" className="ds-btn" onClick={() => void poll()}>
            إعادة المحاولة
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="ds-empty">
          {orders.length === 0 ? "لا توجد طلبات تنتظر إجراء." : "لا توجد طلبات في هذه الحالة."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          <AnimatePresence initial={false}>
            {shown.map((o) => {
              const isFresh = fresh.includes(o.id);
              const place = [o.governorate, o.area].filter(Boolean).join(" - ");
              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    border: "1px solid " + (isFresh ? "var(--st-blue, #1d4fa8)" : "var(--c-line, #ECE6DA)"),
                    boxShadow: isFresh ? "0 0 0 3px var(--st-blue-bg, #e2ecfa)" : "none",
                    borderRadius: 12,
                    background: "var(--c-surface, #fff)",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong dir="ltr">{o.order_number}</strong>
                    <strong>{formatMoney(o.total)}</strong>
                  </div>
                  <div style={{ overflowWrap: "anywhere" }}>{o.customer_name}</div>
                  <div style={{ fontSize: 13, color: "var(--c-muted, #6B6458)" }}>
                    {formatDateTime(o.created_at)}
                    {place ? " · " + place : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--c-muted, #6B6458)" }}>
                    {o.pieces} قطع · {o.lines} صنف
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span className={"ao-badge ao-st-" + o.status}>{o.status_label}</span>
                    <span className={"ao-badge ao-pay-" + o.payment_status}>{o.pay_label}</span>
                    {o.has_notes ? <span className="ao-badge">ملاحظات</span> : null}
                  </div>
                  <Link
                    className="ds-btn ds-btn-gold"
                    style={{ justifyContent: "center" }}
                    href={"/admin/orders/live?open=" + o.id}
                    scroll={false}
                  >
                    عرض الطلب
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
