// The 16 independent permission keys. Must match admin_permission_keys() in SQL.
export const PERMISSION_LABELS = {
  dashboard: "لوحة التحكم",
  products: "المنتجات",
  inventory: "المخزون",
  orders: "الطلبات",
  customers: "الزبائن",
  chats: "المحادثات",
  personal_debts: "الديون الشخصية",
  store_debts: "ديون المتجر",
  installments: "الأقساط",
  marketing: "التسويق",
  content: "المحتوى",
  reports: "التقارير",
  costs: "التكاليف",
  settings: "الإعدادات",
  activity_logs: "سجل النشاط",
  admins: "المديرون",
} as const;

export type PermissionKey = keyof typeof PERMISSION_LABELS;
export const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];
