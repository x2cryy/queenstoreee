const ITEMS = [
  { t: "توصيل لكل المحافظات", s: "سريع وآمن" },
  { t: "الدفع عند الاستلام", s: "افحص ثم ادفع" },
  { t: "منتجات أصلية", s: "جودة مضمونة" },
  { t: "دعم على مدار الأسبوع", s: "نرد عليك بسرعة" },
];

export default function TrustBar() {
  return (
    <section className="qx-trust" aria-label="مميزات المتجر">
      <div className="qm-wrap qx-trust-in">
        {ITEMS.map((i) => (
          <div key={i.t} className="qx-trust-i">
            <span className="qx-trust-dot" aria-hidden="true">◆</span>
            <div>
              <b>{i.t}</b>
              <small>{i.s}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
