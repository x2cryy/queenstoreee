"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "../../../lib/auth/session";
import { listStaff } from "../../../lib/auth/staff-actions";
import { createClient } from "../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setStaffStatusAction(fd: FormData) {
  await requireOwner("/admin/staff");
  const id = String(fd.get("user_id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!UUID.test(id) || (status !== "active" && status !== "blocked")) {
    redirect("/admin/staff?err=failed");
  }
  const staff = (await listStaff()) as { user_id: string; role: string }[];
  const target = staff.find((s) => s.user_id === id);
  if (!target || target.role === "owner") redirect("/admin/staff?err=failed");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ account_status: status })
    .eq("id", id)
    .select("id");
  revalidatePath("/admin/staff");
  if (error || !data || data.length === 0) redirect("/admin/staff?err=failed");
  redirect("/admin/staff?ok=status");
}
