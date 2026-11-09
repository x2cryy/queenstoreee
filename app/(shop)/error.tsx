"use client";

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <div className="qm-wrap">
      <div className="qm-empty">
        <h2>حدث خطأ أثناء التحميل</h2>
        <p>تحقق من اتصالك ثم حاول مجدداً.</p>
        <button type="button" className="qm-btn qm-btn-gold" style={{ marginTop: 18, cursor: "pointer" }} onClick={() => reset()}>
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
