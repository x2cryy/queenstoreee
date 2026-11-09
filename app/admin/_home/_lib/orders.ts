import type { Order } from "../../../../lib/admin/home-types";
import { formatDate } from "./utils";

export type Tone = "green" | "blue" | "red" | "amber" | "gray";

export const STATUS_TONE: Record<string, Tone> = {
  new: "blue",
  pending_confirmation: "amber",
  confirmed: "blue",
  preparing: "amber",
  ready: "blue",
  out_for_delivery: "blue",
  delivered: "green",
  cancelled: "red",
  returned: "gray",
};

export const PAY_TONE: Record<string, Tone> = {
  unpaid: "gray",
  paid: "green",
  partial: "amber",
  failed: "red",
  refunded: "gray",
};

export const tone = (map: Record<string, Tone>, key: string): Tone => map[key] ?? "gray";

export const itemCount = (o: Order) => o.items.reduce((s, i) => s + i.qty, 0);

export function fullDateTime(createdAt: string) {
  const d = new Date(Date.parse(createdAt) + 3 * 3_600_000);
  const iso = d.toISOString().slice(0, 10);
  let h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const part = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return `${formatDate(iso)} - ${h}:${m} ${part}`;
}
