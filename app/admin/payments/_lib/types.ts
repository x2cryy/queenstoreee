export const PAGE_SIZE = 20;

export type StatusFilter = "" | "pending" | "succeeded" | "failed";

export type TransferRow = {
  id: string;
  payment_number: string;
  order_id: string;
  order_number: string;
  customer_name: string | null;
  phone: string | null;
  order_total: number;
  order_payment_status: string | null;
  amount: number;
  status: string;
  provider_reference: string | null;
  has_proof: boolean;
  submitted_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
  paid_before: number;
  ref_dupes: number;
  order_status: string | null;
  room: number | null;
  debt_covered: number;
  reviewer_name: string | null;
  review_note: string | null;
};

export type TransferSummary = {
  pending_review: number;
  pending_review_amount: number;
  awaiting_proof: number;
  confirmed_count: number;
  confirmed_amount: number;
  rejected_count: number;
  total_all: number;
};

export type Notice = { tone: "ok" | "err"; text: string } | null;

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

export function toRow(x: unknown): TransferRow {
  const o = obj(x);
  return {
    id: String(o.id ?? ""),
    payment_number: String(o.payment_number ?? ""),
    order_id: String(o.order_id ?? ""),
    order_number: String(o.order_number ?? ""),
    customer_name: str(o.customer_name),
    phone: str(o.phone),
    order_total: num(o.order_total),
    order_payment_status: str(o.order_payment_status),
    amount: num(o.amount),
    status: String(o.status ?? ""),
    provider_reference: str(o.provider_reference),
    has_proof: o.has_proof === true,
    submitted_at: str(o.submitted_at),
    created_at: String(o.created_at ?? ""),
    reviewed_at: str(o.reviewed_at),
    reject_reason: str(o.reject_reason),
    paid_before: num(o.paid_before),
    ref_dupes: num(o.ref_dupes),
    order_status: str(o.order_status),
    room: o.room === null || o.room === undefined ? null : num(o.room),
    debt_covered: num(o.debt_covered),
    reviewer_name: str(o.reviewer_name),
    review_note: str(o.review_note),
  };
}

export function toList(d: unknown): { total: number; rows: TransferRow[] } {
  const o = obj(d);
  return { total: num(o.total), rows: Array.isArray(o.rows) ? o.rows.map(toRow) : [] };
}

export function toSummary(d: unknown): TransferSummary | null {
  if (!d || typeof d !== "object") return null;
  const o = obj(d);
  return {
    pending_review: num(o.pending_review),
    pending_review_amount: num(o.pending_review_amount),
    awaiting_proof: num(o.awaiting_proof),
    confirmed_count: num(o.confirmed_count),
    confirmed_amount: num(o.confirmed_amount),
    rejected_count: num(o.rejected_count),
    total_all: num(o.total_all),
  };
}
