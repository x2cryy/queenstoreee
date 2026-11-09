"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/auth/session";

type Result = { ok: boolean; message: string };

export async function saveAvatarPath(path: string): Promise<Result> {
  const user = await requireUser("/account/profile");
  const re = new RegExp(`^${user.id}/avatar-\\d{10,}\\.(jpg|png|webp)$`);
  if (typeof path !== "string" || !re.test(path)) {
    return { ok: false, message: "مسار الصورة غير صالح." };
  }
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id");
  if (error || !data || data.length === 0) {
    await supabase.storage.from("avatars").remove([path]);
    return { ok: false, message: "تعذّر حفظ الصورة. حاول مرة أخرى." };
  }
  if (before?.avatar_path && before.avatar_path !== path) {
    await supabase.storage.from("avatars").remove([before.avatar_path]);
  }
  revalidatePath("/account/profile");
  return { ok: true, message: "تم تحديث الصورة الشخصية." };
}

export async function removeAvatar(): Promise<Result> {
  const user = await requireUser("/account/profile");
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: null, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, message: "تعذّر حذف الصورة. حاول مرة أخرى." };
  }
  if (before?.avatar_path) {
    await supabase.storage.from("avatars").remove([before.avatar_path]);
  }
  revalidatePath("/account/profile");
  return { ok: true, message: "تم حذف الصورة الشخصية." };
}
