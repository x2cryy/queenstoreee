import Link from "next/link";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { fetchLiveOrders } from "../../../../lib/admin/live-orders";
import { fetchOrderDrawer } from "../../../../lib/admin/order-detail";
import { PageHead } from "../../_components/ui";
import { LiveBoard } from "../_components/LiveBoard";
import { OrderDrawer } from "../_components/OrderDrawer";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function LiveOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["orders"]);
  const sp = await searchParams;
  const open = Array.isArray(sp.open) ? sp.open[0] : sp.open;
  const [res, detail] = await Promise.all([
    fetchLiveOrders(),
    open ? fetchOrderDrawer(open) : Promise.resolve(null),
  ]);

  return (
    <section>
      <PageHead
        title="الطلبات المباشرة"
        desc="الطلبات التي تنتظر إجراء الآن، وتصلك الجديدة تلقائيًا."
        actions={
          <Link className="ds-btn" href="/admin/orders/manage">
            إدارة الطلبات
          </Link>
        }
      />
      <LiveBoard initial={res.ok ? res.orders : []} initialFailed={!res.ok} />
      {detail ? <OrderDrawer data={detail} closeHref="/admin/orders/live" /> : null}
    </section>
  );
}
