"use client";

import { usePathname } from "next/navigation";
import ChatNavLink from "./ChatNavLink";

export default function ChatFab() {
  const path = usePathname();
  if (path.startsWith("/chats") || path.startsWith("/checkout")) return null;
  return (
    <div className="fixed bottom-4 start-4 z-40">
      <ChatNavLink className="rounded-full bg-[#17140F] px-4 py-3 text-[#FBF7EF] shadow-lg" />
    </div>
  );
}
