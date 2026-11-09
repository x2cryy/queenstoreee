import Link from "next/link";
import { ImageOff, Layers, Package, Tag } from "lucide-react";
import { Badge } from "../../_components/ui";
import { fmtIQD, fmtNum } from "../../../../lib/admin/fmt";
import type { Counts, Item } from "../../../../lib/admin/inventory";
import st from "../inventory.module.css";

export type Tile = {
  key: string; href: string; name: string; counts: Counts;
  icon: "all" | "none" | "cat"; image: string | null; hidden?: boolean;
};

export function CategoryGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className={st.grid}>
      {tiles.map((t) => (
        <Link key={t.key} href={t.href} className={st.tile}>
          <div className={st.tileVisual}>
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" loading="lazy" className={st.fill} />
            ) : t.icon === "all" ? <Layers size={34} /> : t.icon === "none" ? <Package size={34} /> : <Tag size={34} />}
          </div>
          <div className={st.tileName}>{t.name}</div>
          <div className={st.muted}>{fmtNum(t.counts.total)} منتج</div>
          <div className={st.badges}>
            {t.counts.low > 0 ? <Badge tone="warn">{fmtNum(t.counts.low)} منخفض</Badge> : null}
            {t.counts.out > 0 ? <Badge tone="bad">{fmtNum(t.counts.out)} نافد</Badge> : null}
            {t.hidden ? <Badge>تصنيف مخفي</Badge> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function ProductGrid({ items, adjustHref, openHref }: { items: Item[]; adjustHref: (id: string) => string; openHref: (id: string) => string }) {
  return (
    <div className={st.grid}>
      {items.map((p) => {
        const out = p.quantity <= 0;
        const low = !out && p.quantity <= p.low;
        return (
          <div key={p.id} className={st.cardWrap}>
            <Link href={openHref(p.id)} scroll={false} className={st.card} title={p.name}>
              <div className={st.thumb}>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" loading="lazy" className={st.fill} />
                ) : <ImageOff size={28} />}
              </div>
              <div className={st.name}>{p.name}</div>
              {p.brand ? <div className={st.muted}>{p.brand}</div> : null}
              <div className={st.price}>{p.priceFrom ? "يبدأ من " : ""}{fmtIQD(p.price)}</div>
              <div className={st.muted}>الكمية: {fmtNum(p.quantity)}</div>
              <div className={st.badges}>
                {p.status === "hidden" ? <Badge>غير نشط</Badge> : <Badge tone="good">منشور</Badge>}
                {out ? <Badge tone="bad">نافد</Badge> : low ? <Badge tone="warn">منخفض</Badge> : <Badge tone="good">متوفر</Badge>}
              </div>
              {p.variants > 0 ? (
                <div className={st.muted}>
                  {fmtNum(p.variants)} خيارات{p.variantsOut > 0 ? ` — منها نافدة: ${fmtNum(p.variantsOut)}` : ""}
                </div>
              ) : null}
            </Link>
            <Link href={adjustHref(p.id)} className="ds-btn">تعديل الكمية</Link>
          </div>
        );
      })}
    </div>
  );
}
