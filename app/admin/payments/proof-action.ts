"use server";

import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProofResult = { ok: true; url: string } | { ok: false; reason: "none" | "failed" };

// رابط مؤقت (دقيقتان) يُولَّد للتحويل المفتوح فقط، ولا يُخزَّن ولا يُرسل مع القائمة.
export async function getProofUrl(paymentId: string): Promise<ProofResult> {
  await requireAnyPermission(["orders"]);
  const id = String(paymentId ?? "");
  if (!UUID.test(id)) return { ok: false, reason: "failed" };
  const sb = await createClient();
  const { data: path, error } = await sb.rpc("qi7_proof_path", { p_payment_id: id });
  if (error) return { ok: false, reason: "failed" };
  if (!path || typeof path !== "string") return { ok: false, reason: "none" };
  const { data, error: signErr } = await sb.storage.from("transfer-proofs").createSignedUrl(path, 120);
  if (signErr || !data?.signedUrl) return { ok: false, reason: "failed" };
  return { ok: true, url: data.signedUrl };
}
