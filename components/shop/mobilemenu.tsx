"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Category } from "../../lib/shop/queries";
import { MenuIcon, CloseIcon } from "./icons";

export default function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="qm-ib qm-menu-btn"
        aria-label="القائمة"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="qm-drawer" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="qm-drawer-bg" onClick={close} />
          <div className="qm-drawer-p">
            <div className="qm-drawer-top">
              <span className="qm-logo">QUEEN STORE</span>
              <button type="button" className="qm-ib" aria-label="إغلاق" onClick={close}>
                <CloseIcon />
              </button>
            </div>
            <nav className="qm-drawer-nav">
              <Link href="/products" onClick={close}>جميع المنتجات</Link>
              <Link href="/categories" onClick={close}>الأقسام</Link>
              {categories.map((c) => (
                <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`} onClick={close}>
                  {c.name}
                </Link>
              ))}
            </nav>
            <div className="qm-drawer-foot">
              <Link href="/account" onClick={close}>حسابي</Link>
              <Link href="/cart" onClick={close}>السلة</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
