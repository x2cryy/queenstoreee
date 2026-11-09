"use client";

import { useEffect, useState } from "react";
import Hero from "../../../components/shop/Hero";
import Footer from "../../../components/shop/Footer";
import HomeSections from "../../../components/shop/HomeSections";
import { publicImageUrl } from "../../../lib/shop/images";
import type { Banner, Category, ProductCardData } from "../../../lib/shop/queries";
import {
  normalizeContact,
  normalizeSections,
  type Contact,
  type HomeSection,
} from "../../../lib/shop/site-content-types";

type PBanner = Banner & { src: string | null };
type Draft = { banners: PBanner[]; sections: HomeSection[]; contact: Contact };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function readBanners(raw: unknown): PBanner[] {
  if (!Array.isArray(raw)) return [];
  const out: PBanner[] = [];
  for (const r of raw.slice(0, 20)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const src = typeof o.src === "string" && /^(blob:|https:\/\/)/.test(o.src) ? o.src : null;
    out.push({
      id: str(o.id, 80),
      title: str(o.title, 120),
      subtitle: str(o.subtitle, 300) || null,
      image_path: null,
      link_url: str(o.link_url, 500) || null,
      src,
    } as unknown as PBanner);
  }
  return out;
}

export default function PreviewBody({
  initial,
  banners,
  cats,
  featured,
  latest,
  failed,
}: {
  initial: { sections: HomeSection[]; contact: Contact };
  banners: Banner[];
  cats: Category[];
  featured: ProductCardData[];
  latest: ProductCardData[];
  failed: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    banners: banners.map((b) => ({ ...b, src: publicImageUrl("banners", b.image_path) })),
    sections: initial.sections,
    contact: initial.contact,
  }));

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; draft?: Record<string, unknown> } | null;
      if (!d || d.type !== "qs-preview-draft" || !d.draft) return;
      setDraft({
        banners: readBanners(d.draft.banners),
        sections: normalizeSections(d.draft.sections),
        contact: normalizeContact(d.draft.contact),
      });
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "qs-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <>
      <main id="main">
        <Hero banners={draft.banners.slice(0, 5)} imageOf={(b) => (b as PBanner).src} />
        <HomeSections sections={draft.sections} cats={cats} featured={featured} latest={latest} />
        {failed ? (
          <p className="qm-wrap" role="status">
            تعذّر تحميل بعض بيانات المتجر في المعاينة.
          </p>
        ) : null}
      </main>
      <Footer categories={cats} contact={draft.contact} />
    </>
  );
}
