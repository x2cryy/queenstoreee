"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

function read(): string[] {
  const m = document.cookie.split("; ").find((c) => c.startsWith("qs_fav="));
  if (!m) return [];
  return m.slice(7).split(",").filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
}

function write(list: string[]) {
  const v = list.slice(0, 60).map(encodeURIComponent).join(",");
  document.cookie = `qs_fav=${v}; path=/; max-age=31536000; samesite=lax`;
}

export default function FavButton({ slug, overlay = false }: { slug: string; overlay?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().includes(slug)); }, [slug]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cur = read();
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [slug, ...cur];
    write(next);
    setOn(next.includes(slug));
  }

  return (
    <button type="button" onClick={toggle} aria-label={on ? "إزالة من المفضلة" : "إضافة للمفضلة"} className={(overlay ? "qf-ov " : "") + "qf-btn" + (on ? " qf-on" : "")}>
      <Heart size={18} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
