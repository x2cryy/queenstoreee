"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { BagIcon } from "./icons";

export default function CartLink() {
  const { count, ready } = useCart();
  const n = ready ? count : 0;
  return (
    <Link
      href="/cart"
      className="qm-ib qm-cartlink"
      aria-label={n > 0 ? `السلة، ${n} قطعة` : "السلة"}
    >
      <BagIcon />
      {n > 0 ? <span key={n} className="qm-badge">{n > 99 ? "99+" : n}</span> : null}
    </Link>
  );
}
