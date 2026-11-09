"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { createClient } from "../../../../lib/supabase/server";
import { revalidateShop } from "../../../../lib/admin/revalidate-shop";

export type CatState = { error?: string; ok?: string; n?: number };

const BUCKET = "product-images";
const MAX = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const UUID = /^[0-9a-f-]{36}$/i;

type SB = Awaited<ReturnType<typeof createClient>>;

function done() {
  revalidateShop();
  revalidatePath("/admin/inventory/categories");
}

function makeSlug(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "cat";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

function pickImage(fd: FormData): { file: File | null; error?: string } {
  const f = fd.get("image");
  if (!(f instanceof File) || f.size === 0) return { file: null };
  if (!EXT[f.type]) return { file: null, error: "الصورة يجب أن تكون JPG أو PNG أو WebP." };
  if (f.size > MAX) return { file: null, error: "حجم الصورة كبير، الحد الأقصى 4 ميغابايت." };
  return { file: f };
}

async function putImage(sb: SB, f: File): Promise<{ path?: string; error?: string }> {
  const path = `categories/${crypto.randomUUID()}.${EXT[f.type]}`;
  const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type });
  if (up.error) return { error: "تعذّر رفع الصورة." };
  return { path };
}

export async function createCategory(_prev: CatState, fd: FormData): Promise<CatState> {
  await requireAnyPermission(["products"]);
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { error: "اسم التصنيف يجب أن يكون بين حرفين و60 حرفاً." };
  const img = pickImage(fd);
  if (img.error) return { error: img.error };

  const sb = await createClient();
  const { data: last } = await sb.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort = Number((last as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  let path: string | null = null;
  if (img.file) {
    const r = await putImage(sb, img.file);
    if (r.error) return { error: r.error };
    path = r.path ?? null;
  }
  const { error } = await sb.from("categories").insert({ name, slug: makeSlug(name), sort_order: sort, is_active: true, image_path: path });
  if (error) {
    if (path) await sb.storage.from(BUCKET).remove([path]);
    return { error: "تعذّر إنشاء التصنيف." };
  }
  done();
  return { ok: "تمت إضافة التصنيف.", n: Date.now() };
}

export async function updateCategory(_prev: CatState, fd: FormData): Promise<CatState> {
  await requireAnyPermission(["products"]);
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!UUID.test(id)) return { error: "التصنيف غير صالح." };
  if (name.length < 2 || name.length > 60) return { error: "اسم التصنيف يجب أن يكون بين حرفين و60 حرفاً." };
  const img = pickImage(fd);
  if (img.error) return { error: img.error };

  const sb = await createClient();
  const { data: cur } = await sb.from("categories").select("image_path").eq("id", id).maybeSingle();
  if (!cur) return { error: "التصنيف غير موجود." };
  const oldPath = (cur as { image_path: string | null }).image_path;

  let newPath: string | null = null;
  if (img.file) {
    const r = await putImage(sb, img.file);
    if (r.error) return { error: r.error };
    newPath = r.path ?? null;
  }
  const { error } = await sb.from("categories").update({ name, ...(newPath ? { image_path: newPath } : {}) }).eq("id", id);
  if (error) {
    if (newPath) await sb.storage.from(BUCKET).remove([newPath]);
    return { error: "تعذّر حفظ التعديل." };
  }
  if (newPath && oldPath && oldPath.startsWith("categories/")) await sb.storage.from(BUCKET).remove([oldPath]);
  done();
  return { ok: "تم حفظ التعديل.", n: Date.now() };
}

export async function toggleCategory(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const sb = await createClient();
  const { data } = await sb.from("categories").select("is_active").eq("id", id).maybeSingle();
  if (!data) return;
  await sb.from("categories").update({ is_active: !(data as { is_active: boolean }).is_active }).eq("id", id);
  done();
}

export async function moveCategory(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const id = String(fd.get("id") ?? "");
  const dir = String(fd.get("dir") ?? "");
  if (!UUID.test(id) || (dir !== "up" && dir !== "down")) return;
  const sb = await createClient();
  const { data } = await sb.from("categories").select("id,sort_order").order("sort_order").order("created_at");
  const rows = (data ?? []) as { id: string; sort_order: number }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await Promise.all(
    rows.map((r, k) => (r.sort_order === k ? null : sb.from("categories").update({ sort_order: k }).eq("id", r.id))),
  );
  done();
}
