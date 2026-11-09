export const fmtNum = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US").format(Number(n ?? 0));
export const fmtIQD = (n: number | null | undefined) => `${fmtNum(n)} د.ع`;
export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
