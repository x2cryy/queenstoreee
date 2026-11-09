"use server";

import { revalidatePath } from "next/cache";
import { revalidateShop } from "../../../lib/admin/revalidate-shop";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type S360 = { error?: string; ok?: string; n?: number };

const MIN_FRAMES = 8;
const MAX_FRAMES = 72;
type SB = Awaited<ReturnType<typeof createClient>>;

async function sync(sb: SB, pid: string) {
  const c = await sb.from("product_360_images").select("id", { count: "exact", head: true }).eq("product_id", pid);
  if (c.error) return;
  await sb.from("products").update({ has_360_view: (c.count ?? 0) >= MIN_FRAMES }).eq("id", pid);
}

export async function register360(pid: string, paths: string[]): Promise<S360> {
  await requireAnyPermission(["products"]);
  if (!pid || !Array.isArray(paths) || paths.length === 0) return { error: "طلب غير صحيح." };
  if (paths.some((p) => typeof p !== "string" || !p.startsWith(`${pid}/`) || p.includes(".."))) {
    return { error: "مسار صورة غير صحيح." };
  }
  const sb = await createClient();
  const cur = await sb.from("product_360_images").select("sort_order").eq("product_id", pid);
  if (cur.error) return { error: "تعذّر قراءة صور 360 الحالية." };
  const ex = cur.data ?? [];
  if (ex.length + paths.length > MAX_FRAMES) return { error: `الحد الأقصى ${MAX_FRAMES} صورة لعرض 360.` };
  let sort = ex.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
  const ins = await sb.from("product_360_images").insert(paths.map((storage_path) => ({ product_id: pid, storage_path, sort_order: sort++ })));
  if (ins.error) return { error: "تعذّر حفظ بيانات الصور." };
  await sync(sb, pid);
  revalidatePath(`/admin/products/${pid}`);
  revalidateShop();
  return { ok: "تم حفظ الصور.", n: Date.now() };
}

export async function move360(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const id = String(fd.get("id") ?? "");
  const dir = fd.get("dir") === "1" ? 1 : -1;
  if (!pid || !id) return;
  const sb = await createClient();
  const r = await sb.from("product_360_images").select("id").eq("product_id", pid).order("sort_order").order("created_at");
  const ids = (r.data ?? []).map((x) => x.id as string);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (let k = 0; k < ids.length; k++) {
    await sb.from("product_360_images").update({ sort_order: k }).eq("id", ids[k]).eq("product_id", pid);
  }
  revalidatePath(`/admin/products/${pid}`);
}

export async function delete360(fd: FormData): Promise<void> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const id = String(fd.get("id") ?? "");
  if (!pid || !id) return;
  const sb = await createClient();
  // يُحذف السجل فقط؛ الملف يبقى في التخزين (التنظيف يدوي).
  const del = await sb.from("product_360_images").delete().eq("id", id).eq("product_id", pid);
  if (del.error) return;
  await sync(sb, pid);
  revalidatePath(`/admin/products/${pid}`);
  revalidateShop();
}
