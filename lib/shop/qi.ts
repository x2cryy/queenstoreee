import { createPublicClient } from "./client";

export const QI_DEFAULT_STEPS = [
  "انسخ رقم البطاقة من الأعلى.",
  "افتح تطبيق Qi Card.",
  "روح إلى خدمة التحويل المتوفرة بالتطبيق.",
  "دخّل رقم البطاقة المستلمة.",
  "دخّل مبلغ مطابق لإجمالي طلبك.",
  "راجع البيانات وكمّل التحويل.",
  "ارجع لـ QUEEN STORE وارفع صورة الإيصال أو اكتب مرجع التحويل.",
];

export async function getQiEnabled(): Promise<boolean> {
  try {
    const { data } = await createPublicClient().rpc("qi_transfer_enabled");
    return data === true;
  } catch {
    return false;
  }
}
