"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="qs-empty">
      <h1 className="qs-h1">تعذّر تحميل الصفحة</h1>
      <p className="qs-muted">حدث خطأ أثناء جلب البيانات. لم تتأثر بياناتك.</p>
      <button type="button" className="qs-retry" onClick={reset}>إعادة المحاولة</button>
    </section>
  );
}
