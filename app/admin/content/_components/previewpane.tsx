"use client";

import { useEffect, useRef, useState } from "react";

export type PreviewDraft = {
  banners: { id: string; title: string; subtitle: string; link_url: string; src: string | null }[];
  sections: unknown;
  contact: unknown;
};

const SIZES = [
  { id: "phone", label: "هاتف", w: 390 },
  { id: "tablet", label: "آيباد", w: 820 },
  { id: "laptop", label: "لابتوب", w: 1280 },
] as const;

export default function PreviewPane({ draft }: { draft: PreviewDraft }) {
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("phone");
  const [avail, setAvail] = useState(0);
  const [readyN, setReadyN] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "qs-preview-ready") setReadyN((n) => n + 1);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (readyN === 0) return;
    frame.current?.contentWindow?.postMessage({ type: "qs-preview-draft", draft }, window.location.origin);
  }, [readyN, draft]);

  const w = SIZES.find((s) => s.id === size)?.w ?? 390;
  const scale = avail > 0 ? Math.min(1, (avail - 2) / w) : 1;

  return (
    <div className="ce-preview">
      <div className="ce-psizes" role="group" aria-label="حجم المعاينة">
        {SIZES.map((s) => (
          <button key={s.id} type="button" className="ds-btn ce-sm" aria-pressed={size === s.id} onClick={() => setSize(s.id)}>
            {s.label} · {s.w}
          </button>
        ))}
      </div>
      <div className="ce-pwrap" ref={wrap}>
        <iframe
          ref={frame}
          className="ce-frame"
          title="معاينة المتجر"
          src="/preview"
          style={{ width: w, height: `calc(var(--ce-ph) / ${scale})`, marginLeft: -w / 2, transform: `scale(${scale})` }}
        />
      </div>
      <p className="ce-hint">
        معاينة تقريبية: عرض الإطار الفعلي {w}px لكنه مصغّر بصريًا، والنقرات فيه معطّلة. تعرض البانرات الفعّالة بغض النظر عن الجدولة. افحص المتجر على جهاز فعلي بعد النشر.
      </p>
    </div>
  );
}
