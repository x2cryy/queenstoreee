import Link from "next/link";

export default function NotFound() {
  return (
    <div className="qm-wrap">
      <div className="qm-empty">
        <h2>الصفحة غير موجودة</h2>
        <p>قد يكون الرابط غير صحيح أو المنتج لم يعد متاحاً.</p>
        <Link href="/products" className="qm-btn qm-btn-gold" style={{ marginTop: 18 }}>
          تصفح المنتجات
        </Link>
      </div>
    </div>
  );
}
