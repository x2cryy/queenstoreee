import Link from "next/link";
import { PageHead, Panel, Empty } from "../../_components/ui";

export default function NotFound() {
  return (
    <section>
      <PageHead
        title="المنتج غير موجود"
        desc="قد يكون حُذف أو أن الرابط غير صحيح."
        actions={<Link className="ds-btn" href="/admin/products">رجوع إلى المنتجات</Link>}
      />
      <Panel>
        <Empty>لا يوجد منتج بهذا الرابط.</Empty>
      </Panel>
    </section>
  );
}
