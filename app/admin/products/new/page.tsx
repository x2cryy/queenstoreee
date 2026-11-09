import Link from "next/link";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { createClient } from "../../../../lib/supabase/server";
import { PageHead } from "../../_components/ui";
import { ProductForm } from "../_components/ProductForm";

export default async function Page() {
  await requireAnyPermission(["products"]);
  const sb = await createClient();
  const { data } = await sb.from("categories").select("id,name").order("sort_order");
  return (
    <section>
      <PageHead
        title="إنشاء منتج"
        desc="أدخل معلومات المنتج وصوره، ثم احفظه كمسودة أو انشره."
        actions={<Link className="ds-btn" href="/admin/products">رجوع إلى المخزون</Link>}
      />
      <ProductForm categories={data ?? []} />
    </section>
  );
}
