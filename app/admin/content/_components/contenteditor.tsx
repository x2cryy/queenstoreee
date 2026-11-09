"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./editor.css";
import { publishSiteContent, uploadBannerImage } from "../actions";
import {
  buildPayload,
  draftSig,
  validate,
  type Base,
  type DBanner,
  type Draft,
} from "../../../../lib/admin/content-editor";
import type { Contact, HomeSection } from "../../../../lib/shop/site-content-types";
import BannersPanel from "./BannersPanel";
import SectionsPanel from "./SectionsPanel";
import ContactPanel from "./ContactPanel";
import PreviewPane from "./PreviewPane";

export type EditorProps = {
  version: string;
  banners: DBanner[];
  sections: HomeSection[];
  contact: Contact;
  base: Base;
  categories: { slug: string; name: string }[];
};
type Status = { kind: "idle" | "busy" | "ok" | "error"; text: string };

const LEAVE = "عندك تعديلات غير منشورة. هل تريد المغادرة وفقدانها؟";

export default function ContentEditor(props: EditorProps) {
  const router = useRouter();
  const initial: Draft = { banners: props.banners, sections: props.sections, contact: props.contact, deleted: [] };
  const [draft, setDraft] = useState<Draft>(initial);
  const [seen, setSeen] = useState(props.version);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Fresh data arrived from the server (after publishing): reset to it.
  if (seen !== props.version) {
    setSeen(props.version);
    setDraft(initial);
    setBusy(false);
    setLocked(false);
    setStatus(locked ? { kind: "ok", text: "تم النشر. قد يتأخر ظهور التعديلات في المتجر قرابة دقيقة بسبب التخزين المؤقت." } : { kind: "idle", text: "" });
  }

  const dirty = draftSig(draft) !== draftSig(initial);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const a = t.closest("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || e.defaultPrevented) return;
      const u = new URL(a.href, window.location.href);
      if (u.origin !== window.location.origin) return;
      if (u.pathname === window.location.pathname && u.search === window.location.search) return;
      if (!window.confirm(LEAVE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const previewDraft = useMemo(
    () => ({
      banners: draft.banners
        .filter((b) => b.is_active && b.src)
        .map((b) => ({ id: b.key, title: b.title, subtitle: b.subtitle, link_url: b.link_url, src: b.src })),
      sections: draft.sections,
      contact: draft.contact,
    }),
    [draft.banners, draft.sections, draft.contact],
  );

  const onBanners = (fn: (b: DBanner[]) => DBanner[]) => setDraft((d) => ({ ...d, banners: fn(d.banners) }));
  const onRemove = (b: DBanner) =>
    setDraft((d) => ({
      ...d,
      banners: d.banners.filter((x) => x.key !== b.key),
      deleted: b.id ? [...d.deleted, b.id] : d.deleted,
    }));

  const discard = () => {
    setDraft(initial);
    setConfirmDiscard(false);
    setStatus({ kind: "idle", text: "" });
  };

  async function publish() {
    if (busy || locked || !dirty) return;
    const problem = validate(draft);
    if (problem) {
      setStatus({ kind: "error", text: problem });
      return;
    }
    setBusy(true);
    try {
      let work = draft.banners;
      const pending = work.filter((b) => b.file && !b.uploaded);
      for (let i = 0; i < pending.length; i++) {
        const b = pending[i];
        if (!b.file) continue;
        setStatus({ kind: "busy", text: `رفع الصور ${i + 1} من ${pending.length}...` });
        const fd = new FormData();
        fd.append("file", b.file);
        const r = await uploadBannerImage(fd);
        if (!r.path) {
          setStatus({ kind: "error", text: r.error ?? "تعذّر رفع الصورة. لم يُنشر شيء." });
          setBusy(false);
          return;
        }
        const path = r.path;
        work = work.map((x) => (x.key === b.key ? { ...x, uploaded: path } : x));
        setDraft((d) => ({ ...d, banners: d.banners.map((x) => (x.key === b.key ? { ...x, uploaded: path } : x)) }));
      }
      setStatus({ kind: "busy", text: "جارٍ النشر..." });
      const res = await publishSiteContent(buildPayload({ ...draft, banners: work }, props.base));
      if (!res.ok) {
        setStatus({ kind: "error", text: res.error ?? "تعذّر النشر. لم يتغيّر شيء في المتجر." });
        setBusy(false);
        return;
      }
      setLocked(true);
      setBusy(false);
      setStatus({ kind: "ok", text: "تم النشر. جارٍ تحديث العرض..." });
      router.refresh();
    } catch {
      setStatus({ kind: "error", text: "انقطع الاتصال. مسودتك محفوظة في الصفحة، أعد المحاولة." });
      setBusy(false);
    }
  }

  return (
    <section className="ce" data-pane={pane}>
      <header className="ce-head">
        <div className="ce-title">
          <h1 className="ce-h">المحتوى والمظهر</h1>
          <span className="ce-state" data-dirty={dirty ? "1" : "0"}>
            {dirty ? "تغييرات غير منشورة" : "محفوظ ومنشور"}
          </span>
        </div>
        <div className="ce-actions">
          {dirty && !busy && !locked ? (
            confirmDiscard ? (
              <>
                <button type="button" className="ds-btn ce-sm" onClick={discard}>تأكيد التجاهل</button>
                <button type="button" className="ds-btn ce-sm" onClick={() => setConfirmDiscard(false)}>إلغاء</button>
              </>
            ) : (
              <button type="button" className="ds-btn ce-sm" onClick={() => setConfirmDiscard(true)}>تجاهل التعديلات</button>
            )
          ) : null}
          <button type="button" className="ds-btn ds-btn-gold ce-sm" onClick={() => void publish()} disabled={!dirty || busy || locked}>
            {busy ? "جارٍ النشر..." : "نشر التغييرات"}
          </button>
        </div>
      </header>
      <div className="ce-msg" role="status" aria-live="polite" data-kind={status.kind}>{status.text}</div>
      <div className="ce-tabs" role="group" aria-label="العرض">
        <button type="button" className="ds-btn ce-sm" aria-pressed={pane === "edit"} onClick={() => setPane("edit")}>التعديل</button>
        <button type="button" className="ds-btn ce-sm" aria-pressed={pane === "preview"} onClick={() => setPane("preview")}>المعاينة</button>
      </div>
      <div className="ce-grid">
        <div className="ce-edit">
          <BannersPanel banners={draft.banners} categories={props.categories} onChange={onBanners} onRemove={onRemove} />
          <SectionsPanel sections={draft.sections} onChange={(sections) => setDraft((d) => ({ ...d, sections }))} />
          <ContactPanel contact={draft.contact} onChange={(contact) => setDraft((d) => ({ ...d, contact }))} />
        </div>
        <PreviewPane draft={previewDraft} />
      </div>
    </section>
  );
}
