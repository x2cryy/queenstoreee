"use server";

import { revalidatePath } from "next/cache";
import { revalidateShop } from "../../../lib/admin/revalidate-shop";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type FormState = { error?: string; ok?: string; productId?: string; partial?: boolean };

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAnyPermission(["products"]);

  const id = txt(fd.get("id"));
  const name = txt(fd.get("name"));
  const price = num(fd.get("price"));
  const quantity = num(fd.get("quantity"));
  const threshold = num(fd.get("low_stock_threshold"));
  const costRaw = txt(fd.get("cost_price"));
  const cost = costRaw === null ? null : num(costRaw);
  const cmpRaw = txt(fd.get("compare_at_price"));
  const cmp = cmpRaw === null ? null : num(cmpRaw);

  if (!name) return { error: "اسم المنتج مطلوب." };
  if (Number.isNaN(price)) return { error: "أدخل سعر البيع." };
  if (!(price >= 0)) return { error: "السعر غير صحيح." };
  if (!(quantity >= 0)) return { error: "الكمية غير صحيحة." };
  if (!(threshold >= 0)) return { error: "حد التنبيه غير صحيح." };
  if (cost !== null && !(cost >= 0)) return { error: "سعر التكلفة غير صحيح." };
  if (cmp !== null && !(cmp >= 0)) return { error: "السعر قبل الخصم غير صحيح." };
  if (cmp !== null && cmp < price) return { error: "السعر قبل الخصم يجب ألا يقل عن سعر البيع." };

  // الحالة لا تُقرأ من النموذج: الإنشاء مسودة، والتعديل لا يمس الحالة.
  const row = {
    name,
    category_id: txt(fd.get("category_id")),
    brand: txt(fd.get("brand")),
    description: txt(fd.get("description")),
    barcode: txt(fd.get("barcode")),
    price,
    low_stock_threshold: threshold,
    compare_at_price: cmp,
    is_featured: fd.get("is_featured") === "on",
    is_new: fd.get("is_new") === "on",
    updated_at: new Date().toISOString(),
  };

  const sb = await createClient();
  let productId = id;
  let partial: string | null = null;

  const dup = (c?: string) => (c === "23505" ? "الباركود مستخدم لمنتج آخر." : null);
  const QTY_ERR = "حُفظت البيانات لكن تعذّر تسجيل تغيير الكمية (يحتاج صلاحية المخزون).";

  if (id) {
    const { data: old } = await sb.from("products").select("quantity").eq("id", id).maybeSingle();
    if (!old) return { error: "المنتج غير موجود." };
    const { error } = await sb.from("products").update(row).eq("id", id);
    if (error) return { error: dup(error.code) ?? "تعذّر حفظ التعديلات." };
    const diff = quantity - old.quantity;
    if (diff !== 0) {
      const m = await sb.from("inventory_movements").insert({
        product_id: id, change: diff, movement_type: "manual_adjustment",
        reason: "تعديل الكمية من صفحة المنتج",
      });
      if (m.error) return { error: QTY_ERR };
    }
  } else {
    const slug = `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await sb
      .from("products")
      .insert({ ...row, quantity: 0, slug, status: "hidden" })
      .select("id")
      .single();
    if (error || !data) return { error: dup(error?.code) ?? "تعذّر إضافة المنتج." };
    productId = data.id;
    if (quantity > 0) {
      const m = await sb.from("inventory_movements").insert({
        product_id: data.id, change: quantity, movement_type: "stock_in", reason: "رصيد افتتاحي",
      });
      if (m.error) partial = "qty";
    }
  }

  if (cost !== null && productId) {
    const { error } = await sb
      .from("product_costs")
      .upsert({ product_id: productId, cost_price: cost, updated_at: new Date().toISOString() });
    if (error) {
      if (id) return { error: "حُفظ المنتج لكن تعذّر حفظ سعر التكلفة (تحقق من الصلاحية)." };
      partial = partial ?? "cost";
    }
  }

  try {
    const u = await sb.auth.getUser();
    await sb.from("activity_logs").insert({
      actor_id: u.data.user?.id ?? null,
      action: id ? "product_updated" : "product_created",
      entity_type: "product",
      entity_id: productId,
      details: { name, price, quantity },
    });
  } catch {}

  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  revalidateShop();

  return { ok: id ? "تم حفظ التغييرات." : "تم إنشاء المنتج.", productId: productId ?? undefined, partial: partial !== null };
}

export async function setVisibility(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAnyPermission(["products"]);
  const id = txt(fd.get("id"));
  const target = String(fd.get("target") ?? "");
  if (!id || (target !== "active" && target !== "hidden")) return { error: "طلب غير صحيح." };

  const sb = await createClient();
  const { data: p } = await sb.from("products").select("id,price,category_id").eq("id", id).maybeSingle();
  if (!p) return { error: "المنتج غير موجود." };

  if (target === "active") {
    const missing: string[] = [];
    if (!(Number(p.price) > 0)) missing.push("سعر البيع");
    if (!p.category_id) missing.push("التصنيف");
    const { count, error: ce } = await sb
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);
    if (ce) return { error: "تعذّر التحقق من الصور." };
    if (!count) missing.push("صورة واحدة على الأقل");
    if (missing.length) return { error: "لا يمكن النشر قبل إكمال: " + missing.join("، ") + "." };
  }

  const { data, error } = await sb
    .from("products")
    .update({ status: target, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("status")
    .single();
  if (error || !data || data.status !== target) return { error: "تعذّر تغيير حالة الظهور." };

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidateShop();
  return { ok: target === "active" ? "تم نشر المنتج وهو ظاهر للزبائن الآن." : "تم إخفاء المنتج عن الزبائن." };
}
