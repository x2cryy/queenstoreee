import CartProvider from "../../components/shop/CartProvider";
import Header from "../../components/shop/Header";
import { getBanners, getCategories, getFeatured, getLatest } from "../../lib/shop/queries";
import { getSiteContent } from "../../lib/shop/site-content";
import PreviewFrame from "./_components/PreviewFrame";
import PreviewBody from "./_components/PreviewBody";

export const dynamic = "force-dynamic";

export default async function PreviewPage() {
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
  const [banners, cats, featured, latest] = await Promise.all([
    safe(getBanners),
    safe(getCategories),
    safe(() => getFeatured(24)),
    safe(() => getLatest(24)),
  ]);

  return (
    <CartProvider>
      <PreviewFrame>
        <Header categories={cats} />
        <PreviewBody
          initial={{ sections: content.sections, contact: content.contact }}
          banners={banners}
          cats={cats}
          featured={featured}
          latest={latest}
          failed={state.failed}
        />
      </PreviewFrame>
    </CartProvider>
  );
}
