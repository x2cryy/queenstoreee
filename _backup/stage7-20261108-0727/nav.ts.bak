import type { PermissionKey } from "../../../lib/auth/permissions";

export type NavChild = {
  href: string;
  label: string;
  icon: string;
  perms: PermissionKey[];
  match?: string[];
  ownerOnly?: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  perms?: PermissionKey[]; // visible if the admin holds ANY of these
  ownerOnly?: boolean;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "الرئيسية", icon: "home", perms: ["dashboard"] },
  { href: "/admin/inventory", label: "المخزون", icon: "boxes", perms: ["products", "inventory"] },
  {
    href: "/admin/orders",
    label: "الطلبات",
    icon: "receipt",
    perms: ["orders"],
    children: [
      { href: "/admin/orders/live", label: "الطلبات المباشرة", icon: "radio", perms: ["orders"] },
      { href: "/admin/orders/manage", label: "إدارة الطلبات", icon: "listchecks", perms: ["orders"] },
    ],
  },
  { href: "/admin/payments", label: "تحويلات Qi Card", icon: "wallet", perms: ["orders"] },
  {
    href: "/admin/debts",
    label: "الديون",
    icon: "wallet",
    perms: ["store_debts", "personal_debts", "installments"],
    children: [
      { href: "/admin/debts/personal", label: "ديون شخصية", icon: "user", perms: ["personal_debts"], ownerOnly: true },
      { href: "/admin/debts/store", label: "ديون المتجر", icon: "store", perms: ["store_debts"] },
      { href: "/admin/debts/installments", label: "الأقساط", icon: "calendar", perms: ["installments"], match: ["/admin/debts/payments"] },
    ],
  },
  { href: "/admin/chats", label: "المحادثات", icon: "chat", perms: ["chats"] },
  { href: "/admin/customers", label: "الزبائن", icon: "users", perms: ["customers"] },
  { href: "/admin/marketing", label: "التسويق والعروض", icon: "megaphone", perms: ["marketing"] },
  { href: "/admin/content", label: "المحتوى والمظهر", icon: "palette", perms: ["content"] },
  { href: "/admin/reports", label: "التقارير", icon: "chart", perms: ["reports"] },
  { href: "/admin/settings", label: "الإعدادات", icon: "settings", perms: ["settings"] },
  { href: "/admin/staff", label: "المديرون والصلاحيات", icon: "shield", ownerOnly: true },
  { href: "/admin/activity", label: "سجل النشاطات", icon: "history", perms: ["activity_logs"] },
];

export function canSee(item: NavItem, perms: PermissionKey[], isOwner: boolean) {
  if (isOwner) return true;
  if (item.ownerOnly) return false;
  return (item.perms ?? []).some((p) => perms.includes(p));
}
