export type DebtDir = "receivable" | "payable";

export const DIR_LABEL: Record<string, string> = { receivable: "لي", payable: "عليّ" };
export const DIR_LONG: Record<string, string> = {
  receivable: "مبلغ لي عند الطرف",
  payable: "مبلغ عليّ للطرف",
};
export const STATUS_LABEL: Record<string, string> = {
  open: "مفتوح",
  partial: "مسدد جزئيًا",
  paid: "مسدد بالكامل",
  cancelled: "ملغي",
  late: "متأخر",
};
export const METHOD_LABEL: Record<string, string> = { cash: "نقدًا", transfer: "تحويل", other: "أخرى" };

// Today in Baghdad (YYYY-MM-DD), never UTC.
export const todayIQ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());

// "late" is computed, never stored: has a due date in the past and is not fully paid / cancelled.
export function effectiveStatus(status: string, due: string | null, today: string) {
  return due && due < today && (status === "open" || status === "partial") ? "late" : status;
}

const AR = "٠١٢٣٤٥٦٧٨٩";
const FA = "۰۱۲۳۴۵۶۷۸۹";
export const toDigits = (v: string) =>
  v.replace(/[٠-٩۰-۹]/g, (d) => String(AR.indexOf(d) >= 0 ? AR.indexOf(d) : FA.indexOf(d)));

export const STORE_DIR_LABEL: Record<string, string> = { receivable: "للمتجر", payable: "على المتجر" };
export const STORE_DIR_LONG: Record<string, string> = {
  receivable: "مستحق للمتجر بذمة الطرف",
  payable: "مستحق على المتجر للطرف",
};
