import Link from "next/link";
import type { ListQuery } from "../../lib/shop/listing";

function href(basePath: string, q: ListQuery, page: number) {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.sort !== "newest") p.set("sort", q.sort);
  if (q.min !== null) p.set("min", String(q.min));
  if (q.max !== null) p.set("max", String(q.max));
  if (q.inStock) p.set("stock", "1");
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export default function Pagination({
  basePath,
  query,
  pages,
}: {
  basePath: string;
  query: ListQuery;
  pages: number;
}) {
  if (pages <= 1) return null;
  const cur = Math.min(query.page, pages);
  const nums: number[] = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(pages, cur + 2); i++) nums.push(i);
  return (
    <nav className="qm-pager" aria-label="الصفحات">
      {cur > 1 ? <Link href={href(basePath, query, cur - 1)}>السابق</Link> : null}
      {nums.map((n) =>
        n === cur ? (
          <span key={n} className="qm-pg-on" aria-current="page">{n}</span>
        ) : (
          <Link key={n} href={href(basePath, query, n)}>{n}</Link>
        )
      )}
      {cur < pages ? <Link href={href(basePath, query, cur + 1)}>التالي</Link> : null}
    </nav>
  );
}
