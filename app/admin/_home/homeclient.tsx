"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Store } from "lucide-react";
import type { HomeData } from "../../../lib/admin/home-types";
import QuickActions from "./QuickActions";
import SummaryCards from "./SummaryCards";
import RecentOrders from "./RecentOrders";
import OrderDrawer from "./OrderDrawer";
import StockAlerts from "./StockAlerts";
import FollowUp from "./FollowUp";
import { longDate } from "./_lib/utils";

export default function HomeClient({ data }: { data: HomeData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = data.orders.state === "ok" ? data.orders.data.list : [];
  const selected = list.find((o) => o.id === selectedId) ?? null;

  const closeDrawer = useCallback(() => {
    const id = selectedId;
    setSelectedId(null);
    if (id !== null) setTimeout(() => document.getElementById(`hp-order-${id}`)?.focus(), 0);
  }, [selectedId]);

  const hasMain = data.orders.state !== "hidden";
  const hasSide = data.stock.state !== "hidden" || data.follow.state !== "hidden";

  return (
    <MotionConfig reducedMotion="user">
      <div className="hp-root" dir="rtl">
        <div className="hp-body">
          <header className="hp-head">
            <div>
              <h1 className="hp-title">الرئيسية</h1>
              <p className="hp-desc">طلباتك وتنبيهاتك وإجراءاتك اليومية في مكان واحد</p>
              <p className="hp-date">{longDate(data.today)}</p>
            </div>
            <Link className="hp-btn" href="/" target="_blank" rel="noopener noreferrer">
              <Store size={18} aria-hidden /> معاينة المتجر
            </Link>
          </header>

          <QuickActions access={data.access} />

          <motion.div className="hp-flow" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <SummaryCards summary={data.summary} />

            {hasMain || hasSide ? (
              <div className={hasMain && hasSide ? "hp-main" : "hp-main hp-main--solo"}>
                {hasMain && <RecentOrders sec={data.orders} selectedId={selectedId} onOpen={setSelectedId} />}
                {hasSide && (
                  <div className="hp-side">
                    <StockAlerts sec={data.stock} />
                    <FollowUp sec={data.follow} />
                  </div>
                )}
              </div>
            ) : (
              <section className="hp-card">
                <p className="hp-note">لا توجد أقسام إضافية متاحة لصلاحياتك في الرئيسية.</p>
              </section>
            )}
          </motion.div>
        </div>

        <OrderDrawer order={selected} onClose={closeDrawer} />
      </div>
    </MotionConfig>
  );
}
