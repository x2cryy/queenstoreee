"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/hero/hero-1.jpeg", a: "أزياء وإكسسوارات", b: "بلمسة هادئة وأنيقة" },
  { src: "/hero/hero-2.jpeg", a: "عطور وإكسسوارات", b: "تفاصيل تكمّل أناقتك" },
  { src: "/hero/hero-3.jpeg", a: "كل ما تحتاجينه", b: "بذوق راقٍ وجودة عالية" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Hero(_props: { banners?: unknown; imageOf?: (b: any) => string | null }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="qh-hero" aria-label="العروض">
      {SLIDES.map((s, n) => (
        <div key={s.src} className={n === i ? "qh-slide qh-on" : "qh-slide"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.src} alt="" className="qh-img" />
          <div className="qh-shade" />
          <div className="qh-text">
            {n === i ? (
              <>
                <h1 className="qh-t1">{s.a}</h1>
                <p className="qh-t2">{s.b}</p>
                <p className="qh-t3">تشكيلة مختارة من الأزياء والإكسسوارات والمنتجات المتنوعة.</p>
                <Link href="/products" className="qh-btn">تصفّح المنتجات</Link>
              </>
            ) : null}
          </div>
        </div>
      ))}
      <div className="qh-dots">
        {SLIDES.map((s, n) => (
          <button key={s.src} type="button" aria-label={`صورة ${n + 1}`} onClick={() => setI(n)} className={n === i ? "qh-dot qh-dot-on" : "qh-dot"} />
        ))}
      </div>
    </section>
  );
}
