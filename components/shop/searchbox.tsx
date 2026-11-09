"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPublicClient } from "../../lib/shop/client";
import { publicImageUrl } from "../../lib/shop/images";
import { formatPrice } from "../../lib/shop/format";
import { SearchIcon } from "./icons";

type Sug = { id: string; name: string; slug: string; price: number; image: string | null };
type Row = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  product_images: { storage_path: string; sort_order: number; is_primary: boolean }[] | null;
};

const clean = (s: string) =>
  s.replace(/[%_\\,()*."'`:;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export default function SearchBox() {
  const [value, setValue] = useState("");
  const [items, setItems] = useState<Sug[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = clean(value);
    if (t.length < 2) {
      setItems([]);
      setState("idle");
      return;
    }
    let live = true;
    setState("loading");
    const h = setTimeout(async () => {
      try {
        const sb = createPublicClient();
        const { data, error } = await sb
          .from("products")
          .select("id, name, slug, price, product_images(storage_path, sort_order, is_primary)")
          .neq("status", "hidden")
          .or(`name.ilike."%${t}%",brand.ilike."%${t}%"`)
          .order("created_at", { ascending: false })
          .limit(24);
        if (!live) return;
        if (error) throw error;
        const rows = (data ?? []) as unknown as Row[];
        setItems(
          rows.map((r) => {
            const img = [...(r.product_images ?? [])].sort(
              (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
            )[0];
            return {
              id: r.id,
              name: r.name,
              slug: r.slug,
              price: Number(r.price) || 0,
              image: publicImageUrl("product-images", img?.storage_path),
            };
          })
        );
        setState("done");
      } catch {
        if (live) setState("error");
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(h);
    };
  }, [value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const term = clean(value);
  const show = open && term.length >= 2;
  const close = () => setOpen(false);

  return (
    <form
      ref={box}
      action="/search"
      method="get"
      role="search"
      className="qm-search"
      onSubmit={close}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <input
        name="q"
        type="search"
        placeholder="ابحث عن منتج"
        aria-label="بحث"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      <button type="submit" className="qm-ib" aria-label="بحث">
        <SearchIcon />
      </button>

      {show && (
        <div className="qm-sug" role="listbox" aria-label="اقتراحات البحث">
          {state === "loading" && <p className="qm-sug-msg">جارٍ البحث</p>}
          {state === "error" && <p className="qm-sug-msg">تعذر البحث الآن، حاول مجدداً.</p>}
          {state === "done" && items.length === 0 && (
            <p className="qm-sug-msg">لا توجد نتائج لـ «{term}»</p>
          )}
          {state === "done" &&
            items.map((s) => (
              <Link
                key={s.id}
                href={`/product/${encodeURIComponent(s.slug)}`}
                className="qm-sug-item"
                role="option"
                aria-selected={false}
                onClick={close}
              >
                <span className="qm-sug-img">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </span>
                <span className="qm-sug-t">
                  <span>{s.name}</span>
                  <small>{formatPrice(s.price)}</small>
                </span>
              </Link>
            ))}
          {state !== "idle" && (
            <Link href={`/search?q=${encodeURIComponent(term)}`} className="qm-sug-all" onClick={close}>
              عرض كل النتائج
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
