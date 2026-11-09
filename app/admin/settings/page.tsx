import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { fmtIQD } from "../../../lib/admin/fmt";
import { PageHead, KpiGrid, Panel, Empty } from "../_components/ui";
import { DeliveryForm } from "./_components/DeliveryForm";

export default async function Page() {
  await requireAnyPermission(["settings"]);
  const sb = await createClient();
  const { data, error } = await sb.from("site_settings").select("value").eq("key", "delivery").maybeSingle();
  if (error) {
    return (
      <section>
        <PageHead title="الإعدادات" />
        <Panel><Empty>تعذّر تحميل الإعدادات. حدّث الصفحة وحاول مجدداً.</Empty></Panel>
      </section>
    );
  }
  const v = (data?.value ?? {}) as { fee?: unknown; free_over?: unknown };
  const fee = typeof v.fee === "number" ? v.fee : 0;
  const freeOver = typeof v.free_over === "number" ? v.free_over : null;

  return (
    <section>
      <PageHead title="الإعدادات" desc="إعدادات المتجر المؤثرة على الطلبات." />
      <KpiGrid
        items={[
          { label: "رسوم التوصيل", value: fee === 0 ? "مجاني" : fmtIQD(fee) },
          { label: "حد التوصيل المجاني", value: freeOver === null ? "غير مفعّل" : fmtIQD(freeOver) },
        ]}
      />
      <Panel title="التوصيل">
        <DeliveryForm fee={fee} freeOver={freeOver} />
      </Panel>
    </section>
  );
}
