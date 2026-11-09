export type PayMethod = "cash" | "transfer" | "other";

export const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: "cash", label: "نقداً" },
  { value: "transfer", label: "تحويل" },
  { value: "other", label: "أخرى" },
];

export type FinResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const iqd = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(
    Number(n ?? 0),
  ) + " د.ع";

export const newIdem = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
