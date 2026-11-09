import Hero from "../../components/shop/Hero";
import TrustBar from "../../components/shop/TrustBar";
import Deals from "../../components/shop/Deals";
import ProductCard from "../../components/shop/ProductCard";
import "../../components/shop/shop-extras.css";
import HomeSections from "../../components/shop/HomeSections";
import {
  getBanners,
  getCategories,
  getFeatured,
  getLatest,
  type Category,
  type ProductCardData,
} from "../../lib/shop/queries";
import { getSiteContent } from "../../lib/shop/site-content";
import type { HomeSectionId } from "../../lib/shop/site-content-types";

export const revalidate = 60;

export default async function Home() {
  const state = { failed: false };
  const safe = async <T,>(fn: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await fn();
    } catch {
      state.failed = true;
      return [];
    }
  };

  const content = await getSiteContent();
  const byId = new Map(content.sections.map((s) => [s.id, s]));
  const on = (id: HomeSectionId) => byId.get(id)?.visible === true;
  const lim = (id: HomeSectionId) => byId.get(id)?.limit ?? 8;

  const [banners, cats, featured, latest] = await Promise.all([
    safe(getBanners),
    on("categories") ? safe(getCategories) : Promise.resolve([] as Category[]),
    on("featured") ? safe(() => getFeatured(lim("featured"))) : Promise.resolve([] as ProductCardData[]),
    on("latest") ? safe(() => getLatest(lim("latest"))) : Promise.resolve([] as ProductCardData[]),
  ]);

  const noProducts = (on("featured") || on("latest")) && featured.length === 0 && latest.length === 0;


  return (
    <>
      <Hero banners={banners} />
        <TrustBar />

      <HomeSections sections={content.sections} cats={cats} featured={featured} latest={latest} />

        {featured.length > 0 && (
          <Deals title="عروض اليوم">
            {featured.slice(0, 4).map((p) => (
              <ProductCard key={"d" + p.id} p={p} />
            ))}
          </Deals>
        )}

        {featured.length > 0 && (
          <section className="qm-sec qm-wrap" aria-label="الأكثر مبيعاً">
            <div className="qm-sec-h">
              <h2>الأكثر مبيعاً</h2>
            </div>
            <div className="qm-grid">
              {(featured.length > 4 ? featured.slice(4, 8) : featured.slice(0, 4)).map((p) => (
                <ProductCard key={"b" + p.id} p={p} />
              ))}
            </div>
          </section>
        )}

      {noProducts && (
        <div className="qm-wrap">
          <div className="qm-empty">
            <h2>{state.failed ? "تعذر تحميل المنتجات حالياً" : "لا توجد منتجات منشورة بعد"}</h2>
            <p>{state.failed ? "تحقق من اتصالك وأعد المحاولة بعد قليل." : "تابعنا قريباً."}</p>
          </div>
        </div>
      )}
    </>
  );
}
