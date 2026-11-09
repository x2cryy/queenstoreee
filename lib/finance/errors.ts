const MAP: [RegExp, string][] = [
  [/permission|not allowed|denied|forbidden/i, "لا تملك صلاحية لهذه العملية"],
  [/exceed|overpay|greater than remaining|remaining/i, "المبلغ يتجاوز الرصيد المتبقي"],
  [/amount.*(positive|zero|invalid)|must be > 0/i, "المبلغ يجب أن يكون أكبر من صفر"],
  [/total|plan.*exceed/i, "قيمة الخطة تتجاوز المبلغ المستحق"],
  [/not found/i, "السجل غير موجود"],
];

export function finError(e: unknown): string {
  const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? "";
  for (const [re, ar] of MAP) if (re.test(msg)) return ar;
  return "تعذر تنفيذ العملية. تحقق من البيانات وحاول مرة أخرى";
}
