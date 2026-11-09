"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { saveProduct, setVisibility } from "../actions";
import { registerImages } from "../media-actions";
import { createClient } from "../../../../lib/supabase/browser";
import { fmtIQD } from "../../../../lib/admin/fmt";
import { Badge } from "../../_components/ui";
import s from "./product-form.module.css";

export type ProductInit = {
  id: string; name: string; category_id: string | null; brand: string | null;
  description: string | null; barcode: string | null; price: number; quantity: number;
  low_stock_threshold: number; status: string; is_featured: boolean; is_new: boolean; compare_at_price: number | null;
};

type Intent = "draft" | "publish" | "save";
type F = {
  name: string; category_id: string; brand: string; barcode: string; description: string;
  price: string; cost_price: string; compare_at_price: string; quantity: string; low_stock_threshold: string;
  is_featured: boolean; is_new: boolean;
};
type Pick = { key: string; file: File; preview: string };

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 12;
const ORDER = ["name", "category_id", "price", "cost_price", "compare_at_price", "quantity", "low_stock_threshold", "images"];

const toNum = (v: string) => Number(v.replace(/,/g, ""));
const isNum = (v: string) => v.trim() !== "" && Number.isFinite(toNum(v)) && toNum(v) >= 0;

function Note({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 14, border: "1px dashed var(--c-line-strong, #DDD5C5)", borderRadius: 12, color: "var(--c-muted, #6B6458)", lineHeight: 1.8, fontSize: 14 }}>
      <Info size={18} style={{ flexShrink: 0, marginTop: 4 }} />
      <div>{children}</div>
    </div>
  );
}

function Section({ title, desc, id, children }: { title: string; desc?: string; id?: string; children: ReactNode }) {
  return (
    <section className="ds-panel" id={id}>
      <div className="ds-panel-head">
        <h2 className="ds-panel-title">{title}</h2>
        {desc ? <span className={s.secDesc}>{desc}</span> : null}
      </div>
      <div className="ds-panel-body">{children}</div>
    </section>
  );
}

function Field({ id, label, optional, err, hint, children }: { id: string; label: string; optional?: boolean; err?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="ds-label" htmlFor={id}>
        {label}
        {optional ? <span className={s.opt}>اختياري</span> : null}
      </label>
      {children}
      {hint && !err ? <div className="ds-desc">{hint}</div> : null}
      {err ? <p id={id + "-err"} className={s.err} role="alert">{err}</p> : null}
    </div>
  );
}

export function ProductForm({
  categories, product, cost, primaryUrl, adjMax = 0,
}: {
  categories: { id: string; name: string }[];
  product?: ProductInit;
  cost?: number | null;
  primaryUrl?: string | null;
  adjMax?: number;
}) {
  const p = product;
  const router = useRouter();
  const [f, setF] = useState<F>({
    name: p?.name ?? "",
    category_id: p?.category_id ?? "",
    brand: p?.brand ?? "",
    barcode: p?.barcode ?? "",
    description: p?.description ?? "",
    price: p ? String(p.price) : "",
    cost_price: cost != null ? String(cost) : "",
    compare_at_price: p?.compare_at_price != null ? String(p.compare_at_price) : "",
    quantity: p ? String(p.quantity) : "0",
    low_stock_threshold: p ? String(p.low_stock_threshold) : "5",
    is_featured: p?.is_featured ?? false,
    is_new: p?.is_new ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ t: "error" | "ok" | "warn"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [files, setFiles] = useState<Pick[]>([]);
  const [pickNote, setPickNote] = useState<string | null>(null);
  const lock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const createdId = useRef<string | null>(null);
  const uploaded = useRef<Record<string, string>>({});
  const registered = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const touch = (k: string) => {
    setDirty(true);
    setErrors((e) => {
      if (!e[k]) return e;
      const n = { ...e };
      delete n[k];
      return n;
    });
  };
  const text = (k: keyof F) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF((prev) => ({ ...prev, [k]: e.target.value }));
    touch(k);
  };
  const check = (k: "is_featured" | "is_new") => (e: ChangeEvent<HTMLInputElement>) => {
    setF((prev) => ({ ...prev, [k]: e.target.checked }));
    setDirty(true);
  };
  const aria = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? k + "-err" : undefined });

  function validate(intent: Intent) {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "اسم المنتج مطلوب.";
    if (f.price.trim() === "") e.price = "أدخل سعر البيع.";
    else if (!isNum(f.price)) e.price = "السعر غير صحيح.";
    else if (intent === "publish" && toNum(f.price) <= 0) e.price = "السعر يجب أن يكون أكبر من صفر للنشر.";
    if (f.cost_price.trim() !== "" && !isNum(f.cost_price)) e.cost_price = "سعر التكلفة غير صحيح.";
    if (f.compare_at_price.trim() !== "") {
      if (!isNum(f.compare_at_price)) e.compare_at_price = "السعر قبل الخصم غير صحيح.";
      else if (isNum(f.price) && toNum(f.compare_at_price) < toNum(f.price)) e.compare_at_price = "يجب ألا يقل عن سعر البيع.";
    }
    if (!isNum(f.quantity)) e.quantity = "أدخل كمية صحيحة.";
    if (!isNum(f.low_stock_threshold)) e.low_stock_threshold = "أدخل حد تنبيه صحيحًا.";
    if (intent === "publish") {
      if (!f.category_id) e.category_id = "اختر التصنيف قبل النشر.";
      if (files.length === 0) e.images = "أضف صورة واحدة على الأقل قبل النشر.";
    }
    return e;
  }

  function focusField(k: string) {
    const el = document.getElementById(k === "images" ? "images-section" : k);
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    (el as HTMLElement).focus?.();
  }

  async function submit(intent: Intent) {
    if (lock.current) return;
    const errs = validate(intent);
    setErrors(errs);
    const first = ORDER.find((k) => errs[k]);
    if (first) {
      setMsg({ t: "error", text: "راجع الحقول المحددة." });
      focusField(first);
      return;
    }
    lock.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      (["name", "category_id", "brand", "barcode", "description", "price", "cost_price", "compare_at_price", "quantity", "low_stock_threshold"] as const)
        .forEach((k) => fd.set(k, f[k]));
      if (f.is_featured) fd.set("is_featured", "on");
      if (f.is_new) fd.set("is_new", "on");
      const id = p?.id ?? createdId.current;
      if (id) fd.set("id", id);

      setProgress("جارٍ حفظ المنتج...");
      const res = await saveProduct({}, fd);
      if (res.error) { setMsg({ t: "error", text: res.error }); return; }

      if (p) {
        setDirty(false);
        setMsg({ t: "ok", text: res.ok ?? "تم حفظ التغييرات." });
        router.refresh();
        return;
      }

      const pid = res.productId ?? createdId.current;
      if (!pid) { setMsg({ t: "error", text: "تعذّر تحديد المنتج بعد الحفظ." }); return; }
      createdId.current = pid;
      const partial = !!res.partial;

      const sb = createClient();
      for (let i = 0; i < files.length; i++) {
        const it = files[i];
        if (uploaded.current[it.key]) continue;
        setProgress(`جارٍ رفع الصور (${i + 1}/${files.length})...`);
        const path = `${pid}/${crypto.randomUUID()}.${TYPES[it.file.type]}`;
        const up = await sb.storage.from("product-images").upload(path, it.file, { contentType: it.file.type });
        if (up.error) {
          setMsg({ t: "error", text: "حُفظ المنتج كمسودة لكن تعذّر رفع صورة. اضغط الحفظ مرة أخرى لإكمال الرفع." });
          return;
        }
        uploaded.current[it.key] = path;
      }
      if (files.length > 0 && !registered.current) {
        const r = await registerImages(pid, files.map((x) => uploaded.current[x.key]));
        if (r.error) { setMsg({ t: "error", text: "حُفظ المنتج لكن تعذّر حفظ الصور: " + r.error + " اضغط الحفظ للمحاولة مرة أخرى." }); return; }
        registered.current = true;
      }

      let done = partial ? "partial" : "draft";
      if (intent === "publish") {
        setProgress("جارٍ النشر...");
        const v = new FormData();
        v.set("id", pid);
        v.set("target", "active");
        const vr = await setVisibility({}, v);
        done = vr.error ? "publish_failed" : "published";
      }
      setDirty(false);
      router.push(`/admin/products/${pid}?done=${done}`);
    } catch {
      setMsg({ t: "error", text: "تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى." });
    } finally {
      lock.current = false;
      setBusy(false);
      setProgress(null);
    }
  }

  function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    let note: string | null = null;
    const add: Pick[] = [];
    for (const file of Array.from(list)) {
      if (!TYPES[file.type]) { note = "صيغة غير مدعومة. استخدم JPG أو PNG أو WebP."; continue; }
      if (file.size > MAX_BYTES) { note = "حجم الصورة أكبر من 5 ميغابايت."; continue; }
      if (files.length + add.length >= MAX_IMAGES) { note = `الحد الأقصى ${MAX_IMAGES} صورة.`; break; }
      add.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    setPickNote(note);
    if (fileInput.current) fileInput.current.value = "";
    if (add.length) { setFiles((l) => [...l, ...add]); touch("images"); }
  }
  const moveFile = (i: number, d: number) =>
    setFiles((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const makePrimary = (i: number) =>
    setFiles((l) => (i === 0 ? l : [l[i], ...l.filter((_, k) => k !== i)]));
  const removeFile = (i: number) =>
    setFiles((l) => {
      URL.revokeObjectURL(l[i].preview);
      return l.filter((_, k) => k !== i);
    });

  const priceN = isNum(f.price) ? toNum(f.price) : null;
  const costN = f.cost_price.trim() !== "" && isNum(f.cost_price) ? toNum(f.cost_price) : null;
  const unit = priceN !== null && costN !== null ? priceN - costN : null;
  const catName = categories.find((c) => c.id === f.category_id)?.name;
  const status = p ? p.status : "hidden";
  const imgSrc = p ? primaryUrl ?? null : files[0]?.preview ?? null;
  const warns: string[] = [];
  if (!f.name.trim()) warns.push("اسم المنتج ناقص.");
  if (priceN === null) warns.push("سعر البيع ناقص.");
  if (!f.category_id) warns.push("لم يُحدد تصنيف.");
  if (!p && files.length === 0) warns.push("لا توجد صور بعد.");
  if (p && !primaryUrl) warns.push("لا توجد صورة رئيسية.");
  if (unit !== null && unit < 0) warns.push("سعر البيع أقل من التكلفة.");

  const statusBadge =
    status === "hidden" ? <Badge tone="warn">{p ? "مخفي (مسودة)" : "مسودة جديدة"}</Badge>
    : status === "sold_out" ? <Badge tone="info">نفدت الكمية (ظاهر)</Badge>
    : <Badge tone="good">ظاهر للزبائن</Badge>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(p ? "save" : "draft"); }} noValidate>
      <div className={s.bar}>
        {statusBadge}
        <div className={s.barBtns}>
          <Link
            className="ds-btn"
            href="/admin/products"
            onClick={(e) => { if (dirty && !window.confirm("لديك تغييرات غير محفوظة. هل تريد الخروج؟")) e.preventDefault(); }}
          >
            إلغاء
          </Link>
          {p ? (
            <button type="button" className="ds-btn ds-btn-gold" disabled={busy} onClick={() => submit("save")}>
              {busy ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          ) : (
            <>
              <button type="button" className="ds-btn" disabled={busy} onClick={() => submit("draft")}>حفظ كمسودة</button>
              <button type="button" className="ds-btn ds-btn-gold" disabled={busy} onClick={() => submit("publish")}>
                {busy ? "جارٍ التنفيذ..." : "نشر المنتج"}
              </button>
            </>
          )}
        </div>
        {progress ? <p className={s.barMsg} role="status">{progress}</p> : null}
        {msg ? (
          <p className={s.barMsg} role={msg.t === "error" ? "alert" : "status"}
            style={{ color: msg.t === "error" ? "var(--c-bad, #B91C1C)" : msg.t === "warn" ? "var(--c-warn, #B45309)" : "var(--c-good, #15803D)" }}>
            {msg.text}
          </p>
        ) : null}
      </div>

      <div className={s.layout}>
        <fieldset className={s.fs} disabled={busy}>
          <div className={s.main}>
            <Section title="المعلومات الأساسية" desc="الاسم والتصنيف والوصف.">
              <div className={s.grid2}>
                <Field id="name" label="اسم المنتج" err={errors.name}>
                  <input className="ds-input" id="name" value={f.name} onChange={text("name")} {...aria("name")} />
                </Field>
                <Field id="category_id" label="التصنيف" err={errors.category_id} hint="مطلوب للنشر.">
                  <select className="ds-select" id="category_id" value={f.category_id} onChange={text("category_id")} {...aria("category_id")}>
                    <option value="">بدون تصنيف</option>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </Field>
                <Field id="brand" label="الماركة" optional>
                  <input className="ds-input" id="brand" value={f.brand} onChange={text("brand")} />
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field id="description" label="وصف المنتج" optional>
                  <textarea className="ds-input" style={{ height: 120, padding: 12 }} id="description" value={f.description} onChange={text("description")} />
                </Field>
              </div>
            </Section>

            <Section title="صور المنتج" desc="الصورة الأولى هي الرئيسية." id="images-section">
              {p ? (
                <Note>صور هذا المنتج تُدار من قسم «صور المنتج» أسفل هذه الصفحة: إضافة وترتيب وتحديد الرئيسية وحذف.</Note>
              ) : (
                <>
                  <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onPick(e.target.files)} />
                  <button type="button" className="ds-btn ds-btn-gold" onClick={() => fileInput.current?.click()}>إضافة صور</button>
                  {pickNote ? <p className={s.err} role="alert">{pickNote}</p> : null}
                  {errors.images ? <p className={s.err} role="alert">{errors.images}</p> : null}
                  {files.length > 0 ? (
                    <div className={s.imgs}>
                      {files.map((it, i) => (
                        <div key={it.key} className={s.img + (i === 0 ? " " + s.primary : "")}>
                          <img src={it.preview} alt="" />
                          <div className={s.imgBody}>
                            {i === 0 ? <Badge tone="good">الرئيسية</Badge> : (
                              <button type="button" className="ds-btn" style={{ height: 32 }} onClick={() => makePrimary(i)}>جعلها رئيسية</button>
                            )}
                            <div className={s.imgBtns}>
                              <button type="button" className="ds-btn" style={{ height: 32, flex: 1 }} disabled={i === 0} onClick={() => moveFile(i, -1)}>تقديم</button>
                              <button type="button" className="ds-btn" style={{ height: 32, flex: 1 }} disabled={i === files.length - 1} onClick={() => moveFile(i, 1)}>تأخير</button>
                            </div>
                            <button type="button" className="ds-btn" style={{ height: 32, color: "var(--c-bad, #B91C1C)" }} onClick={() => removeFile(i)}>إزالة</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </Section>

            <Section title="السعر والتكلفة" desc="بالدينار العراقي.">
              <div className={s.grid2}>
                <Field id="price" label="سعر البيع (د.ع)" err={errors.price}>
                  <input className="ds-input" id="price" type="number" min={0} inputMode="numeric" value={f.price} onChange={text("price")} {...aria("price")} />
                </Field>
                <Field id="cost_price" label="سعر التكلفة (د.ع)" optional err={errors.cost_price} hint="يُستعمل لحساب الهامش.">
                  <input className="ds-input" id="cost_price" type="number" min={0} inputMode="numeric" value={f.cost_price} onChange={text("cost_price")} {...aria("cost_price")} />
                </Field>
                <Field id="compare_at_price" label="السعر قبل الخصم (د.ع)" optional err={errors.compare_at_price} hint="يُحسب منه خصم المتجر للزبون.">
                  <input className="ds-input" id="compare_at_price" type="number" min={0} inputMode="numeric" value={f.compare_at_price} onChange={text("compare_at_price")} {...aria("compare_at_price")} />
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                {costN === null ? (
                  <Note>التكلفة غير مسجلة.</Note>
                ) : unit === null ? (
                  <Note>أدخل سعر البيع لعرض الهامش.</Note>
                ) : (
                  <div className="ds-kpi" data-tone={unit < 0 ? "bad" : "good"}>
                    <span className="ds-kpi-label">{adjMax > 0 ? "الهامش المبدئي للوحدة (يختلف حسب التركيبة)" : "الهامش المبدئي للوحدة"}</span>
                    <span className="ds-kpi-value">{adjMax > 0 ? fmtIQD(unit) + " – " + fmtIQD(unit + adjMax) : fmtIQD(unit)}</span>
                    <span className="ds-kpi-hint">
                      {unit < 0 ? "تنبيه: سعر البيع أقل من التكلفة." : adjMax > 0 ? "من السعر الأساسي حتى أعلى تركيبة، قبل باقي المصاريف." : priceN ? "هامش " + Math.round((unit / priceN) * 1000) / 10 + "% قبل باقي المصاريف" : ""}
                    </span>
                  </div>
                )}
              </div>
            </Section>

            <Section title="المخزون والخيارات" desc="الكمية وحد التنبيه.">
              <div className={s.grid2}>
                <Field id="quantity" label="الكمية" err={errors.quantity}>
                  <input className="ds-input" id="quantity" type="number" min={0} inputMode="numeric" value={f.quantity} onChange={text("quantity")} {...aria("quantity")} />
                </Field>
                <Field id="low_stock_threshold" label="حد تنبيه المخزون" err={errors.low_stock_threshold} hint="عند هذا الرقم أو أقل يظهر المنتج «منخفض».">
                  <input className="ds-input" id="low_stock_threshold" type="number" min={0} inputMode="numeric" value={f.low_stock_threshold} onChange={text("low_stock_threshold")} {...aria("low_stock_threshold")} />
                </Field>
                <Field id="barcode" label="الباركود" optional>
                  <input className="ds-input" id="barcode" dir="ltr" value={f.barcode} onChange={text("barcode")} />
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Note>{p ? "الخيارات (اللون والمقاس) تُدار من قسم «الخيارات والتركيبات» أسفل هذه الصفحة." : "الخيارات تُضاف من صفحة المنتج بعد حفظه."}</Note>
              </div>
            </Section>

            <Section title="الظهور في المتجر" desc="العلامات المميزة.">
              <Note>
                {p ? "حالة الظهور تُدار من زر «نشر / إخفاء» أعلى الصفحة. حفظ التعديلات لا يغيّرها." : "«حفظ كمسودة» يبقي المنتج مخفيًا. «نشر المنتج» يحفظه ويرفع صوره ثم يظهر للزبائن."}
              </Note>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--c-text, #17140F)" }}>
                  <input type="checkbox" checked={f.is_featured} onChange={check("is_featured")} /> منتج مميز
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--c-text, #17140F)" }}>
                  <input type="checkbox" checked={f.is_new} onChange={check("is_new")} /> وصل حديثًا
                </label>
              </div>
            </Section>
          </div>
        </fieldset>

        <aside className={s.aside} aria-label="ملخص المنتج">
          <Section title="ملخص المنتج">
            <div className={s.sumImg}>{imgSrc ? <img src={imgSrc} alt="" /> : "لا توجد صورة"}</div>
            <div className={s.sumName}>{f.name.trim() || "بدون اسم"}</div>
            <div className={s.sumRow}><span>التصنيف</span><span>{catName ?? "غير محدد"}</span></div>
            <div className={s.sumRow}><span>سعر البيع</span><span>{priceN !== null ? (adjMax > 0 ? fmtIQD(priceN) + " – " + fmtIQD(priceN + adjMax) : fmtIQD(priceN)) : "غير محدد"}</span></div>
            <div className={s.sumRow}><span>الكمية</span><span>{isNum(f.quantity) ? toNum(f.quantity) : "-"}</span></div>
            <div className={s.sumRow}><span>الحالة</span><span>{status === "hidden" ? "مسودة" : status === "sold_out" ? "نفدت الكمية" : "ظاهر"}</span></div>
            {warns.length ? <ul className={s.warns}>{warns.map((w) => (<li key={w}>{w}</li>))}</ul> : null}
          </Section>
        </aside>
      </div>
    </form>
  );
}
