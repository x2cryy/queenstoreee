"use client";

import { useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { User } from "lucide-react";
import { removeAvatar, saveAvatarPath } from "./avatar-actions";
import { Notice } from "../../_components/auth/Notice";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX = 2 * 1024 * 1024;

export function AvatarForm({
  userId,
  avatarPath,
}: {
  userId: string;
  avatarPath: string | null;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = avatarPath
    ? `${base}/storage/v1/object/public/avatars/${avatarPath}`
    : null;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = EXT[file.type];
    if (!ext) {
      setMsg({ ok: false, text: "الصيغ المسموحة: JPG وPNG وWEBP." });
      return;
    }
    if (file.size > MAX) {
      setMsg({ ok: false, text: "حجم الصورة يجب ألا يتجاوز 2 ميغابايت." });
      return;
    }
    start(async () => {
      setMsg(null);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });
      if (error) {
        setMsg({ ok: false, text: "تعذّر رفع الصورة. حاول مرة أخرى." });
        return;
      }
      const r = await saveAvatarPath(path);
      setMsg({ ok: r.ok, text: r.message });
    });
  }

  function onRemove() {
    start(async () => {
      setMsg(null);
      const r = await removeAvatar();
      setMsg({ ok: r.ok, text: r.message });
    });
  }

  const btn: React.CSSProperties = {
    minHeight: 44,
    padding: "0 16px",
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid var(--q-line, #e4dfe9)",
    borderRadius: 10,
    background: "var(--q-surface, #ffffff)",
    cursor: pending ? "wait" : "pointer",
    opacity: pending ? 0.6 : 1,
    font: "inherit",
  };

  return (
    <div style={{ margin: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            border: "1px solid var(--q-line, #e4dfe9)",
            background: "var(--q-surface, #ffffff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="الصورة الشخصية"
              width={88}
              height={88}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <User size={36} aria-hidden="true" />
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <label style={btn}>
            {pending ? "جارٍ المعالجة..." : "تغيير الصورة"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPick}
              disabled={pending}
              style={{ display: "none" }}
            />
          </label>
          {url && (
            <button type="button" onClick={onRemove} disabled={pending} style={btn}>
              حذف الصورة
            </button>
          )}
        </div>
      </div>
      {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
    </div>
  );
}
