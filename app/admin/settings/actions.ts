"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type FS = { error?: string; ok?: string; n?: number };

const parse = (v: FormDataEntryValue | null): number | null | undefined => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

export async function saveDelivery(_p: FS, fd: FormData): Promise<FS> {
  await requireAnyPermission(["settings"]);
  const fee = parse(fd.get("fee"));
  const freeOver = parse(fd.get("free_over"));
  if (fee === undefined || fee === null) return { error: "رسوم التوصيل يجب أن تكون رقماً صحيحاً (0 أو أكثر)." };
  if (freeOver === undefined) return { error: "حد التوصيل المجاني يجب أن يكون رقماً صحيحاً أو يُترك فارغاً." };

  const sb = await createClient();
  const cur = await sb.from("site_settings").select("value").eq("key", "delivery").maybeSingle();
  const old = cur.data?.value && typeof cur.data.value === "object" ? (cur.data.value as Record<string, unknown>) : {};
  const { error } = await sb
    .from("site_settings")
    .upsert({ key: "delivery", value: { ...old, fee, free_over: freeOver }, is_public: true, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { error: "تعذّر حفظ الإعدادات." };
  revalidatePath("/admin/settings");
  return { ok: "تم الحفظ.", n: Date.now() };
}
