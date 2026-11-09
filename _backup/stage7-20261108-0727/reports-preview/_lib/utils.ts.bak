export type RangeKey = "today" | "7" | "30" | "month" | "custom";
export type TabKey = "summary" | "sales" | "debts";
export type Period = { key: RangeKey; from: string; to: string };

export const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "الملخص" },
  { key: "sales", label: "المبيعات والأرباح" },
  { key: "debts", label: "الديون والتحصيل" },
];

export const RANGES: { key: Exclude<RangeKey, "custom">; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "7", label: "آخر 7 أيام" },
  { key: "30", label: "آخر 30 يومًا" },
  { key: "month", label: "هذا الشهر" },
];

export const MAX_DAYS = 366;

// المنطقة الزمنية المعتمدة لكل حسابات التقرير: بغداد (UTC+3 بدون توقيت صيفي)
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function isISO(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toMs(s));
}
export const todayISO = (now: number = Date.now()) =>
  new Date(now + TZ_OFFSET_MS).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) =>
  new Date(toMs(iso) + n * DAY_MS).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);

export function resolvePeriod(key: RangeKey, today: string, from?: string, to?: string): Period {
  if (key === "today") return { key, from: today, to: today };
  if (key === "7") return { key, from: addDays(today, -6), to: today };
  if (key === "month") return { key, from: `${today.slice(0, 8)}01`, to: today };
  if (key === "custom" && isISO(from) && isISO(to) && from <= to && to <= today && diffDays(from, to) < MAX_DAYS) {
    return { key, from, to };
  }
  return { key: "30", from: addDays(today, -29), to: today };
}

// الفترة السابقة: نفس عدد الأيام مباشرة قبل بداية الفترة الحالية
export function previousPeriod(p: Period): Period {
  const len = diffDays(p.from, p.to) + 1;
  const to = addDays(p.from, -1);
  return { key: "custom", from: addDays(to, -(len - 1)), to };
}

export const periodLabel = (p: Period) =>
  p.key === "custom" ? "فترة مخصصة" : RANGES.find((r) => r.key === p.key)?.label ?? "";

const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
export const formatDate = (iso: string) =>
  `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
export const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

const nf = new Intl.NumberFormat("en-US");
export const fmtNum = (n: number) => nf.format(Math.round(n));
// \u2066 ... \u2069 يعزل الرقم حتى لا ينقلب ترتيبه داخل النص العربي
export const fmtMoney = (n: number) => `\u2066${fmtNum(n)}\u2069 د.ع`;
export function fmtShort(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)} مليون`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(0)} ألف`;
  return String(Math.round(n));
}

// null = لا تتوفر مقارنة (الفترة السابقة صفر)
export function delta(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
