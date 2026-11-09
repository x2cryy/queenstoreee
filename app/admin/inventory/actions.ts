"use server";

import { revalidatePath } from "next/cache";
import { revalidateShop } from "../../../lib/admin/revalidate-shop";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type AdjustState = { error?: string; ok?: string; n?: number };

const KINDS = {
  stock_in: { t: "stock_in", s: 1 },
  return: { t: "return", s: 1 },
  damage: { t: "damage", s: -1 },
  adj_plus: { t: "manual_adjustment", s: 1 },
  adj_minus: { t: "manual_adjustment", s: -1 },
} as const;

export async function adjustStock(_prev: AdjustState, fd: FormData): Promise<AdjustState> {
  await requireAnyPermission(["inventory"]);
  const productId = String(fd.get("product_id") ?? "");
  const kind = String(fd.get("kind") ?? "") as keyof typeof KINDS;
  const qty = Number(String(fd.get("qty") ?? "").replace(/,/g, ""));
  const reason = String(fd.get("reason") ?? "").trim();

  if (!productId) return { error: "اختر المنتج." };
  if (!(kind in KINDS)) return { error: "نوع الحركة غير صحيح." };
  if (!Number.isInteger(qty) || qty <= 0) return { error: "الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر." };
  if (reason.length < 3) return { error: "اكتب سبب الحركة (3 أحرف على الأقل)." };

  const k = KINDS[kind];
  const sb = await createClient();
  const variantId = String(fd.get("variant_id") ?? "");
  const expectedRaw = fd.get("expected");
  if (expectedRaw !== null && String(expectedRaw) !== "") {
    const { data: cur } = await sb.from("products").select("quantity").eq("id", productId).maybeSingle();
    if (!cur) return { error: "المنتج غير موجود." };
    let curQty = Number((cur as { quantity: number }).quantity);
    if (variantId) {
      const { data: vr } = await sb
        .from("product_variants").select("quantity,track_quantity")
        .eq("id", variantId).eq("product_id", productId).maybeSingle();
      if (!vr) return { error: "الخيار غير موجود." };
      const v = vr as { quantity: number; track_quantity: boolean };
      if (v.track_quantity) curQty = Number(v.quantity);
    }
    if (curQty !== Number(expectedRaw)) {
      return { error: "تغيّرت الكمية قبل الحفظ. حدّث الصفحة وأعد المحاولة." };
    }
  }
  const { error } = await sb.from("inventory_movements").insert({
    product_id: productId, ...(variantId ? { variant_id: variantId } : {}), change: k.s * qty, movement_type: k.t, reason,
  });
  if (error) {
    if (error.code === "23514") return { error: "الكمية الحالية لا تكفي لهذا الخصم." };
    if (error.code === "42501") return { error: "لا تملك صلاحية تعديل المخزون." };
    return { error: "تعذّر تسجيل الحركة." };
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidateShop();
  return { ok: "تم تسجيل الحركة.", n: Date.now() };
}
