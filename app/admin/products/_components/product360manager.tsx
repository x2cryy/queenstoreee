"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/browser";
import { register360, move360, delete360 } from "../media360-actions";
import { Badge } from "../../_components/ui";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_FRAMES = 8;
const MAX_FRAMES = 72;

export function Product360Manager({ productId, images }: { productId: string; images: { id: string; url: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: "error" | "ok"; text: string } | null>(null);
  const [frame, setFrame] = useState(0);
  const n = images.length;
  const shown = Math.min(frame, Math.max(0, n - 1));

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0 || busy) return;
    setMsg(null);
    const files: File[] = [];
    let note: string | null = null;
    for (const f of Array.from(list)) {
      if (!TYPES[f.type]) { note = "صيغة غير مدعومة. استخدم JPG أو PNG أو WebP."; continue; }
      if (f.size > MAX_BYTES) { note = "حجم الصورة أكبر من 5 ميغابايت."; continue; }
      if (n + files.length >= MAX_FRAMES) { note = `الحد الأقصى ${MAX_FRAMES} صورة.`; break; }
      files.push(f);
    }
    if (input.current) input.current.value = "";
    if (files.length === 0) { if (note) setMsg({ t: "error", text: note }); return; }

    setBusy(true);
    try {
      const sb = createClient();
      const paths: string[] = [];
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        setProgress(`جارٍ رفع الصور (${i + 1}/${files.length})...`);
        const path = `${productId}/${crypto.randomUUID()}.${TYPES[files[i].type]}`;
        const up = await sb.storage.from("product-360").upload(path, files[i], { contentType: files[i].type });
        if (up.error) failed++;
        else paths.push(path);
      }
      if (paths.length > 0) {
        setProgress("جارٍ الحفظ...");
        const r = await register360(productId, paths);
        if (r.error) {
          await sb.storage.from("product-360").remove(paths);
          setMsg({ t: "error", text: r.error });
          return;
        }
      }
      if (failed > 0) setMsg({ t: "error", text: `تعذّر رفع ${failed} صورة. أعد اختيارها لإكمال الباقي.` });
      else setMsg({ t: "ok", text: note ?? "تم رفع الصور." });
      router.refresh();
    } catch {
      setMsg({ t: "error", text: "تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى." });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {n >= MIN_FRAMES ? <Badge tone="good">مفعّل</Badge> : <Badge tone="warn">غير مفعّل</Badge>}
        <span className="ds-desc" style={{ margin: 0 }}>
          {n} صورة. يلزم {MIN_FRAMES} صور على الأقل، تُلتقط بالترتيب حول المنتج بزوايا متتابعة.
        </span>
      </div>

      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onPick(e.target.files)} />
      <div>
        <button type="button" className="ds-btn ds-btn-gold" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "جارٍ الرفع..." : "إضافة صور 360"}
        </button>
      </div>
      {progress ? <p role="status" style={{ margin: 0, fontWeight: 600 }}>{progress}</p> : null}
      {msg ? (
        <p role={msg.t === "error" ? "alert" : "status"} style={{ margin: 0, fontWeight: 600, color: msg.t === "error" ? "var(--c-bad, #B91C1C)" : "var(--c-good, #15803D)" }}>
          {msg.text}
        </p>
      ) : null}

      {n >= 2 ? (
        <div style={{ border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 12, padding: 12, background: "var(--c-surface, #fff)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>معاينة الدوران</div>
          <img src={images[shown].url} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block", borderRadius: 8, background: "var(--c-bg-soft, #FAF8F3)" }} />
          <input
            type="range"
            dir="ltr"
            min={0}
            max={n - 1}
            value={shown}
            onChange={(e) => setFrame(Number(e.target.value))}
            aria-label="معاينة الدوران"
            style={{ width: "100%", marginTop: 10 }}
          />
          <div className="ds-kpi-hint">{shown + 1} / {n}</div>
        </div>
      ) : null}

      {n > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
          {images.map((m, i) => (
            <div key={m.id} style={{ border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 12, overflow: "hidden", background: "var(--c-surface, #fff)" }}>
              <img src={m.url} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
              <div style={{ padding: 6, display: "grid", gap: 6 }}>
                <span className="ds-kpi-hint">الزاوية {i + 1}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <form action={move360} style={{ flex: 1 }}>
                    <input type="hidden" name="product_id" value={productId} />
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="dir" value="-1" />
                    <button className="ds-btn" style={{ width: "100%", height: 32 }} type="submit" disabled={i === 0}>تقديم</button>
                  </form>
                  <form action={move360} style={{ flex: 1 }}>
                    <input type="hidden" name="product_id" value={productId} />
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="dir" value="1" />
                    <button className="ds-btn" style={{ width: "100%", height: 32 }} type="submit" disabled={i === n - 1}>تأخير</button>
                  </form>
                </div>
                <form action={delete360}>
                  <input type="hidden" name="product_id" value={productId} />
                  <input type="hidden" name="id" value={m.id} />
                  <button className="ds-btn" style={{ width: "100%", height: 32, color: "var(--c-bad, #B91C1C)" }} type="submit">حذف</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
