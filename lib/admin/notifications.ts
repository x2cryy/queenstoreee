import { cache } from "react";
import { createClient } from "../supabase/server";
import { getRole } from "../auth/session";
import type { PermissionKey } from "../auth/permissions";
import { getMyPermissions } from "./access";
import { formatDateTime } from "./format";

export type Notif = {
  id: string | number;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  when: string;
};
export type Notifs = { state: "ok" | "error"; unread: number; items: Notif[] };

// Which permission is needed to see a notification type. Unknown types: owner only.
function permFor(type: string): PermissionKey | null {
  const t = (type ?? "").toLowerCase();
  if (t.includes("personal")) return "personal_debts";
  if (t.includes("order")) return "orders";
  if (t.includes("stock") || t.includes("inventory")) return "inventory";
  if (t.includes("message") || t.includes("chat")) return "chats";
  if (t.includes("installment")) return "installments";
  if (t.includes("debt")) return "store_debts";
  return null;
}

export const getAdminNotifications = cache(async (): Promise<Notifs> => {
  try {
    const role = await getRole();
    if (role !== "owner" && role !== "staff") return { state: "ok", unread: 0, items: [] };
    const perms = await getMyPermissions();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, link_url, is_read, created_at, audience")
      .in("audience", ["admins", "user"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const visible = (data ?? []).filter((n) => {
      if (role === "owner") return true;
      if (n.audience === "user") return true;
      const need = permFor(n.type);
      return need !== null && perms.includes(need);
    });
    return {
      state: "ok",
      unread: visible.filter((n) => !n.is_read).length,
      items: visible.slice(0, 8).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? null,
        link_url: n.link_url ?? null,
        is_read: !!n.is_read,
        when: formatDateTime(n.created_at),
      })),
    };
  } catch {
    return { state: "error", unread: 0, items: [] };
  }
});
