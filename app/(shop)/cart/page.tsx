import type { Metadata } from "next";
import CartView from "../../../components/shop/CartView";

export const metadata: Metadata = { title: "السلة", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="qm-wrap">
      <div className="qm-pagehead">
        <h1>سلة التسوق</h1>
      </div>
      <CartView />
    </div>
  );
}
