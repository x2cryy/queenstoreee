"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReviewInput = {
  paymentId: string;
  decision: "approve" | "reject";
  reason?: string;
  note?: string;
  ackDup?: boolean;
};
export type ReviewResult = { ok: true; message: string } | { ok: false; message: string; refresh?: boolean };

const MSG: Record<string, string> = {
  forbidden: "ما عندك صلاحية لهذا الإجراء.",
  payment_not_found: "التحويل غير موجود.",
  already_reviewed: "تمت مراجعة هذا التحويل للتو. لم يُسجَّل شيء جديد.",
  proof_required: "لا يمكن القبول قبل رفع إثبات التحويل.",
  order_closed: "الطلب ملغي أو مرجّع، لا يمكن قبول تحويل عليه.",
  order_already_paid: "الطلب مدفوع بالكامل مسبقًا.",
  order_covered_by_debt: "لا يوجد متبقٍ قابل للدفع المباشر لأن الطلب مغطى بدين أو قسط. سجّل السداد من قسم الديون.",
  exceeds_with_debt: "المبلغ يتجاوز المتبقي القابل للدفع المباشر لأن جزءًا من الطلب مغطى بدين أو قسط.",
  exceeds_remaining: "المبلغ يتجاوز المتبقي على الطلب.",
  duplicate_reference: "هذا المرجع مسجل على تحويل مؤكد آخر. أكّد أنه ليس تكرارًا ثم أعد المحاولة.",
  reason_required: "اكتب سبب الرفض.",
  invalid: "طلب غير صالح.",
};
const FALLBACK = "تعذّر تنفيذ العملية. لم يُسجَّل شيء.";

export async function reviewTransferAction(input: ReviewInput): Promise<ReviewResult> {
  await requireAnyPermission(["orders"]);
  const id = String(input?.paymentId ?? "");
  const decision = input?.decision;
  if (!UUID.test(id) || (decision !== "approve" && decision !== "reject")) {
    return { ok: false, message: MSG.invalid };
  }
  const reason = String(input.reason ?? "").trim().slice(0, 300);
  const note = String(input.note ?? "").trim().slice(0, 300);
  if (decision === "reject" && reason.length < 3) {
    return { ok: false, message: "اكتب سبب الرفض (3 أحرف على الأقل)." };
  }

  const sb = await createClient();
  const { error } = await sb.rpc("qi7_review", {
    p_payment_id: id,
    p_approve: decision === "approve",
    p_reason: reason || null,
    p_note: note || null,
    p_ack_dup: input.ackDup === true,
  });

  if (error) {
    const raw = String(error.message ?? "").trim();
    return {
      ok: false,
      message: MSG[raw] ?? FALLBACK,
      refresh: raw === "already_reviewed" || raw === "payment_not_found",
    };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message: decision === "approve" ? "تم تأكيد الاستلام وتسجيل الدفعة مرة واحدة." : "تم رفض التحويل. لم تُسجَّل أي دفعة.",
  };
}
