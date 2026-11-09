export const formatCount = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Baghdad", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
