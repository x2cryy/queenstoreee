"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2 } from "lucide-react";

export function EscClose({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(href, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, href]);
  return null;
}

export function CopyLink({ path }: { path: string }) {
  const [ok, setOk] = useState(false);
  async function go() {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <button type="button" className="ds-btn" onClick={go}>
      {ok ? <Check size={16} /> : <Link2 size={16} />} {ok ? "تم النسخ" : "نسخ رابط المنتج"}
    </button>
  );
}
