export type Sec<T> = { state: "ok"; data: T } | { state: "error" } | { state: "hidden" };

export type MetricData = { value: number; prev: number | null };
export type Metric = Sec<MetricData>;
export type Summary = { newToday: Metric; processing: Metric; sales: Metric; collected: Metric };

export type OrderItem = { name: string; option: string | null; qty: number; unit: number; line: number };
export type Order = {
  id: string;
  number: string;
  customer: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  pay: string;
  payLabel: string;
  phone: string | null;
  place: string | null;
  address: string | null;
  landmark: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
  items: OrderItem[];
  chatId: string | null;
};
export type OrdersData = { list: Order[]; total: number };

export type StockItem = { id: string; name: string; qty: number; threshold: number; state: "low" | "out"; href: string };
export type StockData = { items: StockItem[]; total: number; listHref: string };

export type FollowItem = {
  key: "messages" | "qicard" | "store_debts" | "store_installments";
  label: string;
  href: string;
  state: "ok" | "error" | "na";
  count: number;
  note: string;
};

export type Access = {
  products: boolean;
  orders: boolean;
  marketing: boolean;
  personalDebts: boolean;
  storeDebts: boolean;
  installments: boolean;
};

export type HomeData = {
  today: string;
  access: Access;
  summary: Summary;
  orders: Sec<OrdersData>;
  stock: Sec<StockData>;
  follow: Sec<FollowItem[]>;
};
