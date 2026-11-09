"use server";

import { revalidatePath } from "next/cache";
import { revalidateShop } from "../../../lib/admin/revalidate-shop";
import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";

export type OS = { error?: string; ok?: string; n?: number; opt?: string };
type SB = Awaited<ReturnType<typeof createClient>>;

const KINDS = ["color", "size", "dimension", "custom"];
const MAX_OPTIONS = 3;
const MAX_VALUES = 30;
const WARN_COMBOS = 40;
const MAX_COMBOS = 100;

const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const split = (s: string) =>
  Array.from(new Set(s.split(/[،,\n]/).map((x) => x.trim()).filter(Boolean)));
const E = (error: string, opt?: string): OS => ({ error, opt });
const done = (pid: string) => {
  revalidatePath(`/admin/products/${pid}`);
  revalidateShop();
};

async function activeLinked(sb: SB, pid: string) {
  const v = await sb.from("product_variants").select("id").eq("product_id", pid).eq("is_active", true);
  const ids = (v.data ?? []).map((x) => x.id as string);
  if (ids.length === 0) return false;
  const l = await sb.from("variant_option_values").select("variant_id", { count: "exact", head: true }).in("variant_id", ids);
  return (l.count ?? 0) > 0;
}
async function ownsOption(sb: SB, pid: string, oid: string) {
  const r = await sb.from("product_options").select("id").eq("id", oid).eq("product_id", pid).maybeSingle();
  return !!r.data;
}

export async function addOption(_p: OS, fd: FormData): Promise<OS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const name = txt(fd.get("name"));
  const kind = String(fd.get("kind") ?? "custom");
  const values = split(String(fd.get("values") ?? ""));
  if (!pid) return E("منتج غير صحيح.");
  if (!name) return E("اسم الخيار مطلوب.");
  if (!KINDS.includes(kind)) return E("نوع الخيار غير صحيح.");
  if (values.length === 0) return E("أضف قيمة واحدة على الأقل.");
  if (values.length > MAX_VALUES) return E(`الحد الأقصى ${MAX_VALUES} قيمة لكل خيار.`);
  const sb = await createClient();
  if (await activeLinked(sb, pid)) return E("لا يمكن إضافة خيار جديد وهناك تركيبات فعالة. أوقفها أولًا.");
  const ex = await sb.from("product_options").select("sort_order").eq("product_id", pid);
  if (ex.error) return E("تعذّر قراءة الخيارات.");
  const list = ex.data ?? [];
  if (list.length >= MAX_OPTIONS) return E(`الحد الأقصى ${MAX_OPTIONS} خيارات لكل منتج.`);
  const sort = list.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
  const ins = await sb.from("product_options").insert({ product_id: pid, name, kind, sort_order: sort }).select("id").single();
  if (ins.error || !ins.data) return E(ins.error?.code === "23505" ? "يوجد خيار بهذا الاسم." : "تعذّر إضافة الخيار.");
  const vr = await sb.from("product_option_values").insert(values.map((value, i) => ({ option_id: ins.data.id, value, sort_order: i })));
  if (vr.error) {
    await sb.from("product_options").delete().eq("id", ins.data.id);
    return E("تعذّر حفظ القيم.");
  }
  done(pid);
  return { ok: "تمت إضافة الخيار.", n: Date.now() };
}

export async function addValues(_p: OS, fd: FormData): Promise<OS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const oid = String(fd.get("option_id") ?? "");
  const values = split(String(fd.get("values") ?? ""));
  if (!pid || !oid) return E("طلب غير صحيح.", oid);
  if (values.length === 0) return E("اكتب قيمة واحدة على الأقل.", oid);
  const sb = await createClient();
  if (!(await ownsOption(sb, pid, oid))) return E("الخيار غير موجود.", oid);
  const ex = await sb.from("product_option_values").select("value,sort_order").eq("option_id", oid);
  if (ex.error) return E("تعذّر قراءة القيم.", oid);
  const rows = ex.data ?? [];
  const have = new Set(rows.map((r) => r.value as string));
  const fresh = values.filter((v) => !have.has(v));
  if (fresh.length === 0) return E("القيم موجودة مسبقًا.", oid);
  if (rows.length + fresh.length > MAX_VALUES) return E(`الحد الأقصى ${MAX_VALUES} قيمة لكل خيار.`, oid);
  let sort = rows.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
  const ins = await sb.from("product_option_values").insert(fresh.map((value) => ({ option_id: oid, value, sort_order: sort++ })));
  if (ins.error) return E("تعذّر إضافة القيم.", oid);
  done(pid);
  return { ok: `أضيفت ${fresh.length} قيمة. اضغط «إنشاء التركيبات» لتوليد الجديد منها.`, n: Date.now(), opt: oid };
}

export async function deleteValue(_p: OS, fd: FormData): Promise<OS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const oid = String(fd.get("option_id") ?? "");
  const vid = String(fd.get("value_id") ?? "");
  if (!pid || !oid || !vid) return E("طلب غير صحيح.", oid);
  const sb = await createClient();
  if (!(await ownsOption(sb, pid, oid))) return E("الخيار غير موجود.", oid);
  const vals = await sb.from("product_option_values").select("id").eq("option_id", oid);
  const ids = (vals.data ?? []).map((r) => r.id as string);
  if (!ids.includes(vid)) return E("القيمة غير موجودة.", oid);
  if (ids.length <= 1) return E("لا يمكن حذف آخر قيمة. احذف الخيار بدلًا من ذلك.", oid);
  const used = await sb.from("variant_option_values").select("variant_id", { count: "exact", head: true }).eq("option_value_id", vid);
  if ((used.count ?? 0) > 0) return E("هذه القيمة مرتبطة بتركيبات ولا تُحذف. أوقف التركيبات المرتبطة بها بدلًا من ذلك.", oid);
  const del = await sb.from("product_option_values").delete().eq("id", vid).eq("option_id", oid);
  if (del.error) return E("تعذّر حذف القيمة.", oid);
  done(pid);
  return { ok: "تم حذف القيمة.", n: Date.now(), opt: oid };
}

export async function deleteOption(_p: OS, fd: FormData): Promise<OS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const oid = String(fd.get("option_id") ?? "");
  if (!pid || !oid) return E("طلب غير صحيح.", oid);
  const sb = await createClient();
  if (!(await ownsOption(sb, pid, oid))) return E("الخيار غير موجود.", oid);
  const vals = await sb.from("product_option_values").select("id").eq("option_id", oid);
  const ids = (vals.data ?? []).map((r) => r.id as string);
  if (ids.length) {
    const used = await sb.from("variant_option_values").select("variant_id", { count: "exact", head: true }).in("option_value_id", ids);
    if ((used.count ?? 0) > 0) return E("هذا الخيار مرتبط بتركيبات ولا يُحذف. أوقف التركيبات المرتبطة به بدلًا من ذلك.", oid);
  }
  const del = await sb.from("product_options").delete().eq("id", oid).eq("product_id", pid);
  if (del.error) return E("تعذّر حذف الخيار.", oid);
  done(pid);
  return { ok: "تم حذف الخيار.", n: Date.now() };
}

export async function generateVariants(_p: OS, fd: FormData): Promise<OS> {
  await requireAnyPermission(["products"]);
  const pid = String(fd.get("product_id") ?? "");
  const confirm = fd.get("confirm") === "on";
  if (!pid) return E("منتج غير صحيح.");
  const sb = await createClient();
  const o = await sb
    .from("product_options")
    .select("id,sort_order,product_option_values(id,value,sort_order)")
    .eq("product_id", pid)
    .order("sort_order");
  if (o.error) return E("تعذّر قراءة الخيارات.");
  type V = { id: string; value: string; sort_order: number };
  const groups = ((o.data ?? []) as unknown as { product_option_values: V[] | null }[])
    .map((x) => [...(x.product_option_values ?? [])].sort((a, b) => a.sort_order - b.sort_order))
    .filter((g) => g.length > 0);
  if (groups.length === 0) return E("أضف خيارًا وقيمه أولًا.");
  const total = groups.reduce((m, g) => m * g.length, 1);
  if (total > MAX_COMBOS) return E(`عدد التركيبات ${total} يتجاوز الحد (${MAX_COMBOS}). قلّل القيم.`);
  if (total > WARN_COMBOS && !confirm) return E(`سيتم إنشاء حتى ${total} تركيبة. فعّل خانة التأكيد ثم أعد المحاولة.`);

  let combos: V[][] = [[]];
  for (const g of groups) combos = combos.flatMap((c) => g.map((v) => [...c, v]));

  const ev = await sb.from("product_variants").select("id").eq("product_id", pid);
  if (ev.error) return E("تعذّر قراءة التركيبات الحالية.");
  const evIds = (ev.data ?? []).map((x) => x.id as string);
  const sigs = new Set<string>();
  if (evIds.length) {
    const l = await sb.from("variant_option_values").select("variant_id,option_value_id").in("variant_id", evIds);
    if (l.error) return E("تعذّر قراءة التركيبات الحالية.");
    const m = new Map<string, string[]>();
    for (const r of (l.data ?? []) as { variant_id: string; option_value_id: string }[]) {
      m.set(r.variant_id, [...(m.get(r.variant_id) ?? []), r.option_value_id]);
    }
    m.forEach((arr) => sigs.add([...arr].sort().join("|")));
  }

  let created = 0;
  const partialErr = () =>
    E(created ? `أُنشئت ${created} تركيبة ثم فشل الإنشاء. اضغط مرة أخرى لإكمال الباقي.` : "تعذّر إنشاء التركيبات.");
  for (const c of combos) {
    const sig = c.map((v) => v.id).sort().join("|");
    if (sigs.has(sig)) continue;
    const ins = await sb
      .from("product_variants")
      .insert({ product_id: pid, sku: c.map((v) => v.value).join(" - "), price_adjustment: 0, quantity: 0, track_quantity: true, is_active: true })
      .select("id")
      .single();
    if (ins.error || !ins.data) return partialErr();
    const lk = await sb.from("variant_option_values").insert(c.map((v) => ({ variant_id: ins.data.id, option_value_id: v.id })));
    if (lk.error) {
      await sb.from("product_variants").delete().eq("id", ins.data.id);
      return partialErr();
    }
    created++;
  }
  done(pid);
  if (created === 0) return { ok: "كل التركيبات موجودة مسبقًا.", n: Date.now() };
  return { ok: `تم إنشاء ${created} تركيبة. عدّل سعر وكمية كل تركيبة من القائمة أدناه.`, n: Date.now() };
}
