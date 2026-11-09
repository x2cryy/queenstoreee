import "../../../components/shop/shop-extras.css";
import Link from "next/link";
import type { Metadata } from "next";
import { getCategories } from "../../../lib/shop/queries";

export const revalidate = 60;
export const metadata: Metadata = { title: "الأقسام" };

export default async function CategoriesPage() {
  const cats = await getCategories();
  const top = cats.filter((c) => c.parent_id == null);
  return (
    <div className="qm-wrap">
      <div className="qm-pagehead">
        <h1>الأقسام</h1>
      </div>
      {top.length === 0 ? (
        <div className="qm-empty">
          <h2>لا توجد أقسام بعد</h2>
          <p>تابعنا قريباً.</p>
        </div>
      ) : (
        <div className="qm-cats-page">
          {top.map((c) => (
            <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`} className="qm-cat-card">
              <span className="qm-cat-ico">{c.name.trim().charAt(0)}</span>
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
