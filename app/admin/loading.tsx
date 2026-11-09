export default function AdminLoading() {
  return (
    <section aria-busy="true">
      <div className="qs-page-head">
        <h1 className="qs-h1">جارٍ التحميل...</h1>
      </div>
      <div className="qs-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="qs-skel" />
        ))}
      </div>
    </section>
  );
}
