"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { getRole } from "../auth/session";

// Marks the current admin's own per-user notifications (fin_notify rows) as read.
// audience='admins' rows are shared and have no UPDATE policy, so they are not touched here.
export async function markNotifsRead(adminIds: string[] = []): Promise<{ ok: boolean }> {
  try {
    const role = await getRole();
    if (role !== "owner" && role !== "staff") return { ok: false };
    const supabase = await createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { ok: false };
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("audience", "user")
      .eq("recipient_user_id", u.user.id)
      .eq("is_read", false);
    if (error) throw error;
    const ids = adminIds.filter((x) => typeof x === "string" && x.length > 0).slice(0, 50);
    if (ids.length > 0) {
      const { error: e2 } = await supabase.rpc("mark_admin_notifs_read", { p_ids: ids });
      if (e2) throw e2;
    }
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
