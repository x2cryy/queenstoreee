import { MessageCircle } from "lucide-react";

export default function ChatLink({ kind, orderId, productId, label = "راسل المتجر" }: {
  kind: "general" | "order" | "product" | "support"; orderId?: string; productId?: string; label?: string;
}) {
  const qs = new URLSearchParams({ kind });
  if (orderId) qs.set("order", orderId);
  if (productId) qs.set("product", productId);
  return (
    <a href={`/chats/new?${qs.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-[#B89B6A] px-4 py-2 text-sm text-[#7D6335]">
      <MessageCircle size={16} />{label}
    </a>
  );
}
