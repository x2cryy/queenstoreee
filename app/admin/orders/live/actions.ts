"use server";

import { requireAnyPermission } from "../../../../lib/admin/access";
import { fetchLiveOrders, type LiveResult } from "../../../../lib/admin/live-orders";

export async function refreshLiveOrders(): Promise<LiveResult> {
  await requireAnyPermission(["orders"]);
  return fetchLiveOrders();
}
