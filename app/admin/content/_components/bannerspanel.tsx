"use client";

import { useRef, useState } from "react";
import { Badge } from "../../_components/ui";
import { MAX_BANNERS, linkProblem, type DBanner } from "../../../../lib/admin/content-editor";
import { compressImage } from "../../../../lib/admin/image-compress";
import Arrow from "./Arrow";

type Cat = { slug: string; name: string };
type Props = {
  banners: DBanner[];
  categories: Cat[];
  onChange: (fn: (b: DBanner[]) => DBanner[]) => void;
  onRemove: (b: DBanner) => void;
};

const catSlug = (u: string): string | null => {
  const m = /^\/category\/([^/?#]+)$/.exec(u.trim());
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
};

export default function BannersPanel({ banners, categories, onChange, onRemove }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const counter = useRef(0);

  const patch = (key: string, p: Partial<DBanner>) =>
    onChange((bs) => bs.map((b) => (b.key === key ? { ...b, ...p } : b)));

  const move = (i: number, d: -1 | 1) =>
    onChange((bs) => {
      const j = i + d;
      if (j < 0 || j >= bs.length) return bs;
      const n = bs.slice();
      const [x] = n.splice(i, 1);
      if (x) n.splice(j, 0, x);
      return n;
    });

  const add = () => {
    if (banners.length >= MAX_BANNERS) {
      setMsg(`الحد الأقصى ${MAX_BANNERS} بانر.`);
      return;
    }
    setMsg("");
    counter.current += 1;
    const key = `new-${counter.current}`;
    onChange((bs) => [
      ...bs,
      { key, id: "", title: "", subtitle: "", link_url: "", is_active: true, starts: "", ends: "", image_path: null, src: null, updated_at: null, file: null, uploaded: null },
    ]);
    setEditing(key);
  };

  const pick = async (key: string, input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = "";
    if (!f) return;
    setMsg("جارٍ تجهيز الصورة...");
    try {
      const out = await compressImage(f);
      patch(key, { file: out, uploaded: null, src: URL.createObjectURL(out) });
      setMsg("");
    } catch (e) {
      setMsg(
        e instanceof Error && e.message === "size"
          ? "الصورة كبيرة جدًا حتى بعد الضغط. اختر صورة أصغر."
          : "تعذّر قراءة الصورة. اختر JPG أو PNG أو WebP.",
      );
    }
  };

  return (
    <details className="ce-group" open>
      <summary>البانرات ({banners.length})</summary>
      <div className="ce-body">
        <p className="ce-hint">يعرض المتجر أول 5 بانرات فعّالة فقط، بحسب الترتيب والجدولة.</p>
        {msg ? <p className="ce-warn" role="status">{msg}</p> : null}
        {banners.length === 0 ? <p className="ce-hint">لا توجد بانرات بعد. أضف أول بانر.</p> : null}
        <ul className="ce-list">
          {banners.map((b, i) => {
            const u = b.link_url.trim();
            const slug = catSlug(u);
            const known = slug !== null && categories.some((c) => c.slug === slug);
            const dest = custom === b.key ? "custom" : known ? `cat:${slug ?? ""}` : u === "" ? "default" : "custom";
            const lp = linkProblem(u);
            const meta = b.starts || b.ends ? `من ${b.starts || "—"} إلى ${b.ends || "—"}` : "عرض دائم";
            return (
              <li key={b.key} className="ce-item" data-off={b.is_active ? "0" : "1"}>
                <div className="ce-row">
                  <div className="ce-thumb">
                    {b.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.src} alt="" />
                    ) : (
                      <span>بدون صورة</span>
                    )}
                  </div>
                  <div className="ce-info">
                    <strong>{b.title || "بدون عنوان"}</strong>
                    <small>{meta}</small>
                    <span>{b.is_active ? <Badge tone="good">فعّال</Badge> : <Badge>متوقف</Badge>}</span>
                  </div>
                  <div className="ce-btns">
                    <button type="button" className="ds-btn ce-sm" aria-label="تقديم" onClick={() => move(i, -1)} disabled={i === 0}><Arrow up /></button>
                    <button type="button" className="ds-btn ce-sm" aria-label="تأخير" onClick={() => move(i, 1)} disabled={i === banners.length - 1}><Arrow /></button>
                    <button type="button" className="ds-btn ce-sm" onClick={() => patch(b.key, { is_active: !b.is_active })}>{b.is_active ? "إيقاف" : "تفعيل"}</button>
                    <button type="button" className="ds-btn ce-sm" onClick={() => setEditing(editing === b.key ? null : b.key)}>{editing === b.key ? "إغلاق" : "تعديل"}</button>
                    {confirm === b.key ? (
                      <>
                        <button type="button" className="ds-btn ce-sm" onClick={() => { onRemove(b); setConfirm(null); setEditing(null); }}>تأكيد الحذف</button>
                        <button type="button" className="ds-btn ce-sm" onClick={() => setConfirm(null)}>إلغاء</button>
                      </>
                    ) : (
                      <button type="button" className="ds-btn ce-sm" onClick={() => setConfirm(b.key)}>حذف</button>
                    )}
                  </div>
                </div>
                {editing === b.key ? (
                  <div className="ce-form">
                    <div>
                      <label className="ds-label" htmlFor={`bf-${b.key}`}>الصورة</label>
                      <input id={`bf-${b.key}`} className="ds-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void pick(b.key, e.currentTarget)} />
                      <p className="ce-hint">تُضغط تلقائيًا، وتُرفع عند «نشر التغييرات» فقط.</p>
                    </div>
                    <div>
                      <label className="ds-label" htmlFor={`bt-${b.key}`}>العنوان (اختياري)</label>
                      <input id={`bt-${b.key}`} className="ds-input" maxLength={120} value={b.title} onChange={(e) => patch(b.key, { title: e.target.value })} />
                    </div>
                    <div>
                      <label className="ds-label" htmlFor={`bs-${b.key}`}>نص مختصر (اختياري)</label>
                      <input id={`bs-${b.key}`} className="ds-input" maxLength={300} value={b.subtitle} onChange={(e) => patch(b.key, { subtitle: e.target.value })} />
                    </div>
                    <div>
                      <label className="ds-label" htmlFor={`bd-${b.key}`}>الوجهة عند الضغط</label>
                      <select
                        id={`bd-${b.key}`}
                        className="ds-select"
                        value={dest}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "default") { setCustom(null); patch(b.key, { link_url: "" }); }
                          else if (v === "custom") { setCustom(b.key); }
                          else { setCustom(null); patch(b.key, { link_url: `/category/${encodeURIComponent(v.slice(4))}` }); }
                        }}
                      >
                        <option value="default">كل المنتجات (الافتراضي)</option>
                        {categories.map((c) => (
                          <option key={c.slug} value={`cat:${c.slug}`}>تصنيف: {c.name}</option>
                        ))}
                        <option value="custom">رابط مخصص</option>
                      </select>
                    </div>
                    {dest === "custom" ? (
                      <div>
                        <label className="ds-label" htmlFor={`bl-${b.key}`}>الرابط</label>
                        <input id={`bl-${b.key}`} className="ds-input ce-ltr" dir="ltr" placeholder="/products أو https://..." value={b.link_url} onChange={(e) => patch(b.key, { link_url: e.target.value })} />
                      </div>
                    ) : null}
                    {slug !== null && !known ? <p className="ce-warn">هذا التصنيف غير متاح في المتجر حاليًا.</p> : null}
                    {lp ? <p className="ce-warn">{lp}</p> : null}
                    <div className="ce-two">
                      <div>
                        <label className="ds-label" htmlFor={`b1-${b.key}`}>يبدأ في</label>
                        <input id={`b1-${b.key}`} className="ds-input" type="date" value={b.starts} onChange={(e) => patch(b.key, { starts: e.target.value })} />
                      </div>
                      <div>
                        <label className="ds-label" htmlFor={`b2-${b.key}`}>ينتهي في</label>
                        <input id={`b2-${b.key}`} className="ds-input" type="date" value={b.ends} onChange={(e) => patch(b.key, { ends: e.target.value })} />
                      </div>
                    </div>
                    {b.starts && b.ends && b.starts > b.ends ? <p className="ce-warn">تاريخ البداية بعد النهاية.</p> : null}
                    <p className="ce-hint">النهاية تشمل اليوم كاملًا. اتركهما فارغين لعرض دائم.</p>
                    <label className="ce-check">
                      <input type="checkbox" checked={b.is_active} onChange={(e) => patch(b.key, { is_active: e.target.checked })} />
                      فعّال
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div>
          <button type="button" className="ds-btn ds-btn-gold" onClick={add}>إضافة بانر</button>
        </div>
      </div>
    </details>
  );
}
