import { formatDate } from "../../reports/_lib/utils";
import type { TransferRow } from "./types";

// كل الأوقات بتوقيت بغداد (UTC+3 بدون توقيت صيفي)، مثل بقية التقارير
export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const d = new Date(t + 3 * 3600000).toISOString();
  const h = Number(d.slice(11, 13));
  const m = d.slice(14, 16);
  return `${formatDate(d.slice(0, 10))} · ${h % 12 || 12}:${m} ${h < 12 ? "ص" : "م"}`;
}

export type Tone = "green" | "red" | "amber" | "blue" | "gray";

export function statusInfo(r: Pick<TransferRow, "status" | "has_proof">): { label: string; tone: Tone } {
  if (r.status === "pending") {
    return r.has_proof ? { label: "بانتظار المراجعة", tone: "amber" } : { label: "بانتظار الإثبات", tone: "blue" };
  }
  if (r.status === "succeeded") return { label: "مؤكد", tone: "green" };
  if (r.status === "failed") return { label: "مرفوض", tone: "red" };
  if (r.status === "refunded") return { label: "مسترد", tone: "gray" };
  return { label: r.status || "-", tone: "amber" };
}
