"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type UploadResult = { path?: string; error?: string };
export type PublishResult = { ok?: true; error?: string };

export async function uploadBannerImage(fd: FormData): Promise<UploadResult> {
  await requireAnyPermission(["content"]);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "الملف غير صالح." };
  const ext = EXT[file.type];
  if (!ext) return { error: "الصورة يجب أن تكون JPG أو PNG أو WebP." };
  if (file.size > 900 * 1024) return { error: "حجم الصورة كبير. اختر صورة أصغر." };
  const sb = await createClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from("banners").upload(path, file, { contentType: file.type });
  if (up.error) return { error: "تعذّر رفع الصورة. حاول مرة أخرى." };
  return { path };
}

export async function publishSiteContent(payload: unknown): Promise<PublishResult> {
  await requireAnyPermission(["content"]);
  if (!payload || typeof payload !== "object") return { error: "بيانات غير صالحة." };
  const sb = await createClient();
  const { error } = await sb.rpc("admin_publish_site_content", { p_payload: payload });
  if (error) {
    if (error.code === "40001") {
      return { error: "تغيّر المحتوى من جهة أخرى. حدّث الصفحة ثم أعد تطبيق تعديلاتك." };
    }
    if (error.code === "42501") return { error: "لا تملك صلاحية النشر." };
    if (error.code === "22023") return { error: "بعض القيم غير صالحة. راجع الحقول." };
    return { error: "تعذّر النشر. لم يتغيّر شيء في المتجر." };
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/content");
  return { ok: true };
}
