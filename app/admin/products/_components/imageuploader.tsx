"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/browser";
import { registerImages } from "../media-actions";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

type Item = { key: string; file: File; preview: string; status: "uploading" | "done" | "error"; msg?: string };

export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const busy = items.some((i) => i.status === "uploading");

  const patch = (key: string, p: Partial<Item>) =>
    setItems((l) => l.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function send(it: Item) {
    patch(it.key, { status: "uploading", msg: undefined });
    const sb = createClient();
    const path = `${productId}/${crypto.randomUUID()}.${TYPES[it.file.type]}`;
    const up = await sb.storage.from("product-images").upload(path, it.file, { contentType: it.file.type });
    if (up.error) {
      patch(it.key, { status: "error", msg: "تعذّر رفع الصورة." });
      return;
    }
    const r = await registerImages(productId, [path]);
    if (r.error) {
      await sb.storage.from("product-images").remove([path]);
      patch(it.key, { status: "error", msg: r.error });
      return;
    }
    patch(it.key, { status: "done" });
  }

  function cleanup() {
    setItems((l) => {
      l.filter((i) => i.status === "done").forEach((i) => URL.revokeObjectURL(i.preview));
      return l.filter((i) => i.status !== "done");
    });
    router.refresh();
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setNote(null);
    const fresh: Item[] = [];
    let msg: string | null = null;
    for (const f of Array.from(files)) {
      if (!TYPES[f.type]) { msg = "صيغة غير مدعومة. استخدم JPG أو PNG أو WebP."; continue; }
      if (f.size > MAX_BYTES) { msg = "حجم الصورة أكبر من 5 ميغابايت."; continue; }
      fresh.push({ key: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f), status: "uploading" });
    }
    if (msg) setNote(msg);
    if (input.current) input.current.value = "";
    if (fresh.length === 0) return;
    setItems((l) => [...l, ...fresh]);
    for (const it of fresh) await send(it);
    cleanup();
  }

  async function retry(it: Item) {
    await send(it);
    cleanup();
  }

  function drop(it: Item) {
    URL.revokeObjectURL(it.preview);
    setItems((l) => l.filter((i) => i.key !== it.key));
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => onPick(e.target.files)}
      />
      <button type="button" className="ds-btn ds-btn-gold" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "جارٍ الرفع..." : "إضافة صور"}
      </button>
      {note ? <p role="alert" style={{ color: "var(--c-bad, #B91C1C)", marginTop: 10, fontWeight: 600 }}>{note}</p> : null}
      {items.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, marginTop: 14 }}>
          {items.map((it) => (
            <div key={it.key} style={{ border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 12, overflow: "hidden", background: "var(--c-surface, #fff)" }}>
              <img src={it.preview} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block", opacity: it.status === "uploading" ? 0.5 : 1 }} />
              <div style={{ padding: 6, fontSize: 12, display: "grid", gap: 4 }}>
                {it.status === "uploading" ? <span>جارٍ الرفع...</span> : null}
                {it.status === "error" ? (
                  <>
                    <span role="alert" style={{ color: "var(--c-bad, #B91C1C)", fontWeight: 600 }}>{it.msg}</span>
                    <button type="button" className="ds-btn" style={{ height: 30 }} onClick={() => retry(it)}>إعادة المحاولة</button>
                    <button type="button" className="ds-btn" style={{ height: 30 }} onClick={() => drop(it)}>إزالة</button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
