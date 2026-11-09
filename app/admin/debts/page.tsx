import { redirect } from "next/navigation";
import { getMyPermissions, requireAnyPermission } from "../../../lib/admin/access";

const TABS = {
  personal: "personal_debts",
  store: "store_debts",
  installments: "installments",
} as const;
type Tab = keyof typeof TABS;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAnyPermission(["store_debts", "personal_debts", "installments"]);
  const { tab = "" } = await searchParams;
  const perms = await getMyPermissions();
  if (tab in TABS && perms.includes(TABS[tab as Tab])) {
    redirect(`/admin/debts/${tab}`);
  }
  for (const t of Object.keys(TABS) as Tab[]) {
    if (perms.includes(TABS[t])) redirect(`/admin/debts/${t}`);
  }
  redirect("/forbidden");
}
