"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";
import { rateLimit } from "../../../../../lib/auth/rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERR: Record<string, string> = {
  not_authenticated: "سجّل دخولك أولاً.",
  order_not_found: "الطلب غير موجود.",
  already_paid: "هذا الطلب مدفوع مسبقاً.",
  order_closed: "هذا الطلب ملغي أو مرجّع.",
  proof_required: "اكتب مرجع التحويل أو ارفع صورة الإيصال.",
  bad_proof_path: "مسار الصورة غير صالح.",
  transfer_already_submitted: "أُرسل إثبات لهذا الطلب وهو بانتظار المراجعة.",
  duplicate_reference: "مرجع التحويل هذا مستخدم مسبقاً.",
};

export async function submitTransfer(input: {
  orderId: string;
  reference: string;
  proofPath: string | null;
}): Promise<{ ok: boolean; message: string }> {
  const orderId = String(input.orderId ?? "");
  const reference = String(input.reference ?? "").trim().slice(0, 80);
  const proof = input.proofPath ? String(input.proofPath).trim().slice(0, 300) : null;
  if (!UUID.test(orderId)) return { ok: false, message: ERR.order_not_found };
  if (!reference && !proof) return { ok: false, message: ERR.proof_required };
  if (!(await rateLimit("qi_transfer", 6, 10 * 60 * 1000))) {
    return { ok: false, message: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." };
  }
  const sb = await createClient();
  const { error } = await sb.rpc("submit_qi_transfer", {
    p_order_id: orderId,
    p_reference: reference || null,
    p_proof_path: proof,
  });
  if (error) {
    return { ok: false, message: ERR[(error.message ?? "").trim()] ?? "تعذّر إرسال الإثبات. حاول مرة ثانية." };
  }
  revalidatePath("/orders");
  revalidatePath("/admin/payments");
  return { ok: true, message: "وصل إثبات التحويل. حالة الدفع: بانتظار مراجعة الإدارة." };
}
