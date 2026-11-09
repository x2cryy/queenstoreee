import { PageHead, Panel } from "../../_components/ui";

export default function Loading() {
  return (
    <section>
      <PageHead title="تعديل المنتج" desc="جارٍ تحميل بيانات المنتج..." />
      <Panel>
        <div className="ds-empty" role="status">جارٍ التحميل...</div>
      </Panel>
    </section>
  );
}
