import { redirect } from "next/navigation";

// المنتجات صارت جزءاً من قسم المخزون. نُبقي هذا الرابط القديم يعمل ونحوّله مع نقل البحث والفلاتر.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string; c?: string; open?: string }>;
}) {
  const sp = await searchParams;
  const u = new URLSearchParams();
  if (sp.q) u.set("q", sp.q);
  if (sp.c) u.set("c", sp.c);
  if (sp.open) u.set("open", sp.open);
  if (sp.s === "active") u.set("v", "shown");
  else if (sp.s === "hidden") u.set("v", "hidden");
  else if (sp.s === "low" || sp.s === "out") u.set("s", sp.s);
  const qs = u.toString();
  redirect("/admin/inventory" + (qs ? "?" + qs : ""));
}
