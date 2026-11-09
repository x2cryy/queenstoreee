"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CART_KEY, CART_MAX_LINES, type CartItem } from "../../lib/shop/cart";

export type AddResult = { ok: boolean; message: string };

type Ctx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  addItem: (item: CartItem, stock: number) => AddResult;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: CartItem[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      if (typeof o.productId !== "string") continue;
      const q = Math.floor(Number(o.qty));
      if (!Number.isFinite(q) || q < 1) continue;
      out.push({
        productId: o.productId,
        variantId: typeof o.variantId === "string" ? o.variantId : null,
        qty: Math.min(q, 999),
      });
    }
    return out.slice(0, CART_MAX_LINES);
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // التخزين غير متاح (وضع خاص مثلاً): تبقى السلة داخل الجلسة فقط
  }
}

const same = (x: CartItem, productId: string, variantId: string | null) =>
  x.productId === productId && x.variantId === variantId;

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const ref = useRef<CartItem[]>([]);

  const commit = useCallback((next: CartItem[]) => {
    ref.current = next;
    setItems(next);
    write(next);
  }, []);

  useEffect(() => {
    const init = read();
    ref.current = init;
    setItems(init);
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_KEY && e.key !== null) return;
      const fresh = read();
      ref.current = fresh;
      setItems(fresh);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback(
    (item: CartItem, stock: number): AddResult => {
      const cur = ref.current;
      const idx = cur.findIndex((x) => same(x, item.productId, item.variantId));
      const have = idx >= 0 ? cur[idx].qty : 0;
      if (stock < 1) return { ok: false, message: "هذا الخيار غير متوفر حالياً" };
      if (have >= stock) {
        return { ok: false, message: `لديك الكمية المتاحة كاملة بالسلة (${stock})` };
      }
      if (idx < 0 && cur.length >= CART_MAX_LINES) {
        return { ok: false, message: "السلة وصلت للحد الأقصى من المنتجات" };
      }
      const wanted = have + Math.max(1, item.qty);
      const nextQty = Math.min(stock, wanted);
      const next =
        idx >= 0
          ? cur.map((x, i) => (i === idx ? { ...x, qty: nextQty } : x))
          : [...cur, { productId: item.productId, variantId: item.variantId, qty: nextQty }];
      commit(next);
      return {
        ok: true,
        message:
          wanted > stock
            ? `أُضيفت الكمية المتاحة فقط (${stock})`
            : "تمت الإضافة إلى السلة",
      };
    },
    [commit]
  );

  const setQty = useCallback(
    (productId: string, variantId: string | null, qty: number) => {
      const q = Math.floor(qty);
      if (!Number.isFinite(q) || q < 1) return;
      commit(ref.current.map((x) => (same(x, productId, variantId) ? { ...x, qty: q } : x)));
    },
    [commit]
  );

  const removeItem = useCallback(
    (productId: string, variantId: string | null) => {
      commit(ref.current.filter((x) => !same(x, productId, variantId)));
    },
    [commit]
  );

  const clear = useCallback(() => commit([]), [commit]);

  const count = useMemo(() => items.reduce((n, x) => n + x.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, ready, count, addItem, setQty, removeItem, clear }),
    [items, ready, count, addItem, setQty, removeItem, clear]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): Ctx {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
