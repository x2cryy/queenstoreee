import Link from "next/link";
import {
  Banknote, CalendarDays, CircleCheck, Clock, Hourglass, Package, PackageX,
  ShoppingBag, TriangleAlert, TrendingUp, Users, Wallet,
} from "lucide-react";
import type { Card } from "../../../lib/admin/dashboard";

const ICONS: Record<string, typeof Package> = {
  banknote: Banknote, calendar: CalendarDays, bag: ShoppingBag, hourglass: Hourglass,
  check: CircleCheck, users: Users, package: Package, alert: TriangleAlert,
  packagex: PackageX, wallet: Wallet, clock: Clock, trend: TrendingUp,
};

export function StatCard({ card }: { card: Card }) {
  const Icon = ICONS[card.icon] ?? Package;
  const body = (
    <>
      <div className="qs-card-top">
        <span>{card.label}</span>
        <span className="qs-card-ico"><Icon size={18} /></span>
      </div>
      {card.state === "ok" && <div className="qs-card-val">{card.value}</div>}
      {card.state === "error" && <div className="qs-card-na">تعذّر تحميل هذا الرقم</div>}
      {card.state === "na" && <div className="qs-card-na">غير متاح</div>}
      {card.hint && <div className="qs-card-hint">{card.hint}</div>}
    </>
  );
  if (card.href && card.state !== "na") {
    return <Link href={card.href} className="qs-card" data-tone={card.tone}>{body}</Link>;
  }
  return <div className="qs-card" data-tone={card.tone}>{body}</div>;
}
