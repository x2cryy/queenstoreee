"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type MS = { error?: string; ok?: string; n?: number };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGES = 12;
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "product-images";

const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
};

export async function uploadImages(_p: MS, fd: FormData): Promise<MS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  if (!pid) return { error: "منتج غير صحيح." };
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "اختر صورة واحدة على الأقل." };
  for (const f of files) {
    if (!EXT[f.type]) return { error: "الصور يجب أن تكون JPG أو PNG أو WebP." };
    if (f.size > MAX_BYTES) return { error: "حجم الصورة أكبر من 5 ميغابايت." };
  }
  const sb = await createClient();
  const cur = await sb.from("product_images").select("sort_order,is_primary").eq("product_id", pid);
  if (cur.error) return { error: "تعذّر قراءة الصور الحالية." };
  const existing = cur.data ?? [];
  if (existing.length + files.length > MAX_IMAGES) return { error: `الحد الأقصى ${MAX_IMAGES} صورة لكل منتج.` };

  let sort = existing.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
  let hasPrimary = existing.some((r) => r.is_primary);
  let done = 0;
  for (const f of files) {
    const path = `${pid}/${crypto.randomUUID()}.${EXT[f.type]}`;
    const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (up.error) return { error: done ? `رُفعت ${done} صورة فقط ثم فشل الرفع.` : "تعذّر رفع الصورة." };
    const ins = await sb.from("product_images").insert({
      product_id: pid, storage_path: path, sort_order: sort++, is_primary: !hasPrimary,
    });
    if (ins.error) {
      await sb.storage.from(BUCKET).remove([path]);
      return { error: "تعذّر حفظ بيانات الصورة." };
    }
    hasPrimary = true;
    done++;
  }
  revalidatePath(`/admin/products/${pid}`);
  return { ok: `تم رفع ${done} صورة.`, n: Date.now() };
}

export async function setPrimaryImage(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const id = String(fd.get("id") ?? "");
  if (!pid || !id) return;
  const sb = await createClient();
  await sb.from("product_images").update({ is_primary: false }).eq("product_id", pid);
  await sb.from("product_images").update({ is_primary: true }).eq("id", id).eq("product_id", pid);
  revalidatePath(`/admin/products/${pid}`);
}

export async function deleteImage(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const id = String(fd.get("id") ?? "");
  if (!pid || !id) return;
  const sb = await createClient();
  const r = await sb.from("product_images").select("storage_path,is_primary").eq("id", id).eq("product_id", pid).maybeSingle();
  if (!r.data) return;
  const del = await sb.from("product_images").delete().eq("id", id).eq("product_id", pid);
  if (del.error) return;
  // الملف يبقى في التخزين عمدًا؛ التنظيف يدوي (انظر supabase/orphan-images.sql).
  if (r.data.is_primary) {
    const next = await sb.from("product_images").select("id").eq("product_id", pid).order("sort_order").limit(1).maybeSingle();
    if (next.data) await sb.from("product_images").update({ is_primary: true }).eq("id", next.data.id);
  }
  revalidatePath(`/admin/products/${pid}`);
}

export async function saveVariant(_p: MS, fd: FormData): Promise<MS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const vid = txt(fd.get("id"));
  const sku = txt(fd.get("sku"));
  const adj = int(fd.get("price_adjustment"));
  const qty = int(fd.get("quantity"));
  const track = fd.get("track_quantity") === "on";
  if (!pid) return { error: "منتج غير صحيح." };
  if (!sku) return { error: "اسم المتغير مطلوب (مثل: أحمر - M)." };
  if (!(adj >= 0)) return { error: "فرق السعر يجب أن يكون 0 أو أكثر." };
  if (!(qty >= 0)) return { error: "الكمية غير صحيحة." };

  const sb = await createClient();
  const fields = {
    sku,
    barcode: txt(fd.get("barcode")),
    price_adjustment: adj,
    track_quantity: track,
    is_active: fd.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };
  const dup = (c?: string) => (c === "23505" ? "الباركود أو الرمز مستخدم لمتغير آخر." : null);
  const QTY_ERR = "حُفظ المتغير لكن تعذّر تسجيل تغيير الكمية (يحتاج صلاحية المخزون).";

  if (vid) {
    const old = await sb.from("product_variants").select("quantity").eq("id", vid).eq("product_id", pid).maybeSingle();
    if (!old.data) return { error: "المتغير غير موجود." };
    const u = await sb.from("product_variants").update(fields).eq("id", vid).eq("product_id", pid);
    if (u.error) return { error: dup(u.error.code) ?? "تعذّر حفظ المتغير." };
    const diff = qty - old.data.quantity;
    if (track && diff !== 0) {
      const m = await sb.from("inventory_movements").insert({
        product_id: pid, variant_id: vid, change: diff, movement_type: "manual_adjustment",
        reason: "تعديل كمية المتغير من صفحة المنتج",
      });
      if (m.error) return { error: QTY_ERR };
    }
  } else {
    const ins = await sb.from("product_variants").insert({ ...fields, product_id: pid, quantity: 0 }).select("id").single();
    if (ins.error || !ins.data) return { error: dup(ins.error?.code) ?? "تعذّر إضافة المتغير." };
    if (track && qty > 0) {
      const m = await sb.from("inventory_movements").insert({
        product_id: pid, variant_id: ins.data.id, change: qty, movement_type: "stock_in", reason: "رصيد افتتاحي للمتغير",
      });
      if (m.error) return { error: QTY_ERR };
    }
  }
  revalidatePath(`/admin/products/${pid}`);
  redirect(`/admin/products/${pid}`);
}

export async function toggleVariant(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const id = String(fd.get("id") ?? "");
  if (!pid || !id) return;
  const sb = await createClient();
  await sb.from("product_variants").update({ is_active: fd.get("next") === "1", updated_at: new Date().toISOString() }).eq("id", id).eq("product_id", pid);
  revalidatePath(`/admin/products/${pid}`);
}

export async function registerImages(pid: string, paths: string[]): Promise<MS> {
  await requireAnyPermission(["products"]);
  if (!pid || !Array.isArray(paths) || paths.length === 0) return { error: "طلب غير صحيح." };
  if (paths.some((p) => typeof p !== "string" || !p.startsWith(`${pid}/`) || p.includes(".."))) {
    return { error: "مسار صورة غير صحيح." };
  }
  const sb = await createClient();
  const cur = await sb.from("product_images").select("sort_order,is_primary").eq("product_id", pid);
  if (cur.error) return { error: "تعذّر قراءة الصور الحالية." };
  const ex = cur.data ?? [];
  if (ex.length + paths.length > MAX_IMAGES) return { error: `الحد الأقصى ${MAX_IMAGES} صورة لكل منتج.` };
  let sort = ex.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
  const hasPrimary = ex.some((r) => r.is_primary);
  const rows = paths.map((path) => ({ product_id: pid, storage_path: path, sort_order: sort++, is_primary: false }));
  if (!hasPrimary) rows[0].is_primary = true;
  const ins = await sb.from("product_images").insert(rows);
  if (ins.error) return { error: "تعذّر حفظ بيانات الصورة." };
  revalidatePath(`/admin/products/${pid}`);
  return { ok: "تم حفظ الصورة.", n: Date.now() };
}

export async function moveImage(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const id = String(fd.get("id") ?? "");
  const dir = fd.get("dir") === "1" ? 1 : -1;
  if (!pid || !id) return;
  const sb = await createClient();
  const r = await sb.from("product_images").select("id").eq("product_id", pid).order("sort_order").order("created_at");
  const ids = (r.data ?? []).map((x) => x.id as string);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (let k = 0; k < ids.length; k++) {
    await sb.from("product_images").update({ sort_order: k }).eq("id", ids[k]).eq("product_id", pid);
  }
  revalidatePath(`/admin/products/${pid}`);
}
