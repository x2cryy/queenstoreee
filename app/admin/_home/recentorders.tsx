"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import type { OrdersData, Sec } from "../../../lib/admin/home-types";
import { PAY_TONE, STATUS_TONE, itemCount, tone } from "./_lib/orders";
import { fmtMoney, orderTime } from "./_lib/utils";
import SectionError from "./SectionError";

export default function RecentOrders({
  sec,
  selectedId,
  onOpen,
}: {
  sec: Sec<OrdersData>;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  if (sec.state === "hidden") return null;
  if (sec.state === "error") return <SectionError title="آخر الطلبات" />;

  const { list, total } = sec.data;
  return (
    <section className="hp-card">
      <div className="hp-card-head">
        <h2 className="hp-h2">آخر الطلبات</h2>
        <Link className="hp-link" href="/admin/orders">
          عرض جميع الطلبات
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="hp-empty">
          <Receipt size={28} aria-hidden />
          <p>لا توجد طلبات حتى الآن.</p>
        </div>
      ) : (
        <>
          <ul className="hp-orders">
            {list.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  id={`hp-order-${o.id}`}
                  className="hp-order"
                  aria-current={selectedId === o.id ? "true" : undefined}
                  aria-label={`عرض تفاصيل الطلب رقم ${o.number}`}
                  onClick={() => onOpen(o.id)}
                >
                  <span className="hp-order-main">
                    <span className="hp-order-id">
                      طلب رقم <bdi dir="ltr">{o.number}</bdi>
                    </span>
                    <span className="hp-order-cust">{o.customer}</span>
                    <span className="hp-order-sub">
                      {orderTime(o.createdAt)} · {itemCount(o)} قطعة
                    </span>
                  </span>
                  <span className="hp-order-side">
                    <span className="hp-order-total">{fmtMoney(o.total)}</span>
                  </span>
                  <span className="hp-order-pills">
                    <span className="hp-pill hp-tone" data-tone={tone(STATUS_TONE, o.status)}>
                      {o.statusLabel}
                    </span>
                    <span className="hp-pill hp-tone" data-tone={tone(PAY_TONE, o.pay)}>
                      {o.payLabel}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="hp-note">
            عرض {list.length} من {total} طلبات. عدد القطع هو مجموع كميات المنتجات في الطلب.
          </p>
        </>
      )}
    </section>
  );
}
