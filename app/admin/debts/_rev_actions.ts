"use server";
import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { reversePayment } from "../../../lib/finance/service";
import type { ActionState } from "./_actions";

const KIND = { personal: "debt", store: "debt", installment: "installment" } as const;
const NEED = { personal: "personal_debts", store: "store_debts", installment: "installments" } as const;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function reverseAction(_: ActionState, f: FormData): Promise<ActionState> {
  const k = str(f, "kind") as keyof typeof KIND;
  if (!(k in KIND)) return { ok: false, message: "نوع غير معروف" };
  await requireAnyPermission([NEED[k]]);
  const reason = str(f, "reason");
  if (!reason) return { ok: false, message: "سبب العكس مطلوب" };
  const r = await reversePayment({ kind: KIND[k], payment: str(f, "id"), reason });
  if (!r.ok) return { ok: false, message: r.error };
  for (const p of ["payments", "personal", "store", "installments"]) revalidatePath("/admin/debts/" + p);
  return { ok: true, message: "تم عكس الدفعة وتوثيقه" };
}
