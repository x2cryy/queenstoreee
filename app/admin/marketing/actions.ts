"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// empty -> null, valid whole number -> number, anything else -> NaN
function wholeNumber(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") return null;
  if (!/^\d{1,9}$/.test(s)) return NaN;
  return Number(s);
}

export async function createCouponAction(fd: FormData) {
  await requireAnyPermission(["marketing"]);

  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) redirect("/admin/marketing?err=code");

  const type = String(fd.get("discount_type") ?? "");
  if (type !== "percent" && type !== "fixed") redirect("/admin/marketing?err=value");

  const value = wholeNumber(fd.get("discount_value"));
  if (value === null || Number.isNaN(value) || value < 1) redirect("/admin/marketing?err=value");
  if (type === "percent" && value > 100) redirect("/admin/marketing?err=value");

  const minOrder = wholeNumber(fd.get("min_order_amount"));
  const maxDiscount = wholeNumber(fd.get("max_discount_amount"));
  const usageLimit = wholeNumber(fd.get("usage_limit"));
  if (
    Number.isNaN(minOrder) ||
    Number.isNaN(maxDiscount) ||
    Number.isNaN(usageLimit) ||
    (maxDiscount !== null && maxDiscount < 1) ||
    (usageLimit !== null && usageLimit < 1)
  ) {
    redirect("/admin/marketing?err=numbers");
  }

  const startDate = String(fd.get("starts_at") ?? "").trim();
  const endDate = String(fd.get("ends_at") ?? "").trim();
  if ((startDate && !DATE.test(startDate)) || (endDate && !DATE.test(endDate))) {
    redirect("/admin/marketing?err=dates");
  }
  // Dates are Baghdad time (UTC+3): start of the first day, end of the last day
  const startsAt = startDate ? new Date(`${startDate}T00:00:00+03:00`) : null;
  const endsAt = endDate ? new Date(`${endDate}T23:59:59+03:00`) : null;
  if (
    (startsAt && Number.isNaN(startsAt.getTime())) ||
    (endsAt && Number.isNaN(endsAt.getTime())) ||
    (startsAt && endsAt && endsAt <= startsAt)
  ) {
    redirect("/admin/marketing?err=dates");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    code,
    discount_type: type,
    discount_value: value,
    min_order_amount: minOrder ?? 0,
    max_discount_amount: type === "percent" ? maxDiscount : null,
    usage_limit: usageLimit,
    starts_at: startsAt ? startsAt.toISOString() : null,
    ends_at: endsAt ? endsAt.toISOString() : null,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") redirect("/admin/marketing?err=duplicate");
    redirect("/admin/marketing?err=failed");
  }

  revalidatePath("/admin/marketing");
  redirect("/admin/marketing?ok=created");
}

export async function toggleCouponAction(fd: FormData) {
  await requireAnyPermission(["marketing"]);

  const id = String(fd.get("id") ?? "");
  const active = String(fd.get("active") ?? "");
  if (!UUID.test(id) || (active !== "true" && active !== "false")) {
    redirect("/admin/marketing?err=failed");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .update({ is_active: active === "true" })
    .eq("id", id)
    .select("id");

  revalidatePath("/admin/marketing");
  if (error || !data || data.length === 0) redirect("/admin/marketing?err=failed");
  redirect("/admin/marketing?ok=toggled");
}
