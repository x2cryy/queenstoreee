"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

export default function ProductChatLink() {
  const path = usePathname();
  const m = path.match(/^\/product\/([^/]+)/);
  if (!m) return null;
  let slug = m[1];
  try { slug = decodeURIComponent(slug); } catch {}
  const qs = new URLSearchParams({ kind: "product", slug });
  return (
    <a href={`/chats/new?${qs.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-[#B89B6A] px-4 py-2 text-sm text-[#7D6335]">
      <MessageCircle size={16} />استفسر عن هذا المنتج
    </a>
  );
}
