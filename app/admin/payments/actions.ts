"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../lib/auth/session";
import { createClient } from "../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toEn = (s: string) => s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export async function reviewTransfer(fd: FormData): Promise<void> {
  await requirePermission("orders", "/admin/payments");
  const id = String(fd.get("payment_id") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  if (!UUID.test(id) || (decision !== "approve" && decision !== "reject")) redirect("/admin/payments?err=invalid");
  const sb = await createClient();
  const { error } = await sb.rpc("review_qi_transfer", {
    p_payment_id: id,
    p_approve: decision === "approve",
    p_reason: reason || null,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  if (error) redirect(`/admin/payments?err=${encodeURIComponent((error.message ?? "").trim())}`);
  redirect(`/admin/payments?ok=${decision}`);
}

export async function saveQiSettings(fd: FormData): Promise<void> {
  await requirePermission("settings", "/admin/payments");
  const name = String(fd.get("recipient_name") ?? "").trim().slice(0, 80);
  const card = toEn(String(fd.get("card_number") ?? "")).replace(/\s+/g, " ").trim();
  const enabled = fd.get("enabled") === "on";
  const steps = String(fd.get("steps") ?? "")
    .split("\n")
    .map((s) => s.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 12);
  if (enabled && (name.length < 2 || !/^[0-9 ]{8,25}$/.test(card))) redirect("/admin/payments?err=invalid_settings");
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  const { error } = await sb.from("site_settings").upsert(
    {
      key: "qi_transfer",
      value: { enabled, recipient_name: name, card_number: card, steps },
      is_public: false,
      updated_by: data.user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) redirect("/admin/payments?err=save_failed");
  revalidatePath("/admin/payments");
  redirect("/admin/payments?saved=1");
}
