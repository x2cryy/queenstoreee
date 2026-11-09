import Link from "next/link";
import type { Category } from "../../lib/shop/queries";
import { CONTACT_KEYS, CONTACT_LABELS, contactHref, type Contact, type ContactKey } from "../../lib/shop/site-content-types";

export default function Footer({ categories, contact }: { categories: Category[]; contact?: Contact }) {
  const top = categories.filter((c) => c.parent_id == null).slice(0, 6);
  // لا تظهر أيقونة أو رابط لقيمة فارغة أو غير صالحة أو معطّلة.
  const links = contact
    ? CONTACT_KEYS.map((k) => ({ k, href: contact[k].enabled ? contactHref(k, contact[k]) : null })).filter(
        (x): x is { k: ContactKey; href: string } => !!x.href,
      )
    : [];
  return (
    <footer className="qm-footer">
      <div className={`qm-wrap qm-fgrid${links.length ? " qm-fgrid-4" : ""}`}>
        <div>
          <Link href="/" className="qm-logo qm-flogo">QUEEN STORE</Link>
        </div>
        <nav aria-label="تسوق">
          <h3>تسوق</h3>
          <Link href="/products">جميع المنتجات</Link>
          <Link href="/categories">الأقسام</Link>
          {top.map((c) => (
            <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link>
          ))}
        </nav>
        <nav aria-label="حسابي">
          <h3>حسابي</h3>
          <Link href="/account">حسابي</Link>
          <Link href="/cart">السلة</Link>
        </nav>
        {links.length > 0 && (
          <nav aria-label="تواصل معنا">
            <h3>تواصل معنا</h3>
            {links.map(({ k, href }) =>
              href.startsWith("https://") ? (
                <a key={k} href={href} target="_blank" rel="noopener noreferrer">{CONTACT_LABELS[k]}</a>
              ) : (
                <a key={k} href={href}>{CONTACT_LABELS[k]}</a>
              ),
            )}
          </nav>
        )}
        {/* مكان صفحات السياسات (الخصوصية، الاستبدال، التوصيل): تُضاف لاحقاً من المحتوى */}
      </div>
      <div className="qm-wrap qm-copy">© {new Date().getFullYear()} QUEEN STORE</div>
    </footer>
  );
}
