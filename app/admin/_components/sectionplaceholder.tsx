export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <section className="qs-empty">
      <h1 className="qs-h1">{title}</h1>
      <p className="qs-muted">
        هذا القسم محميّ بالصلاحية وجاهز كهيكل. وظائفه تُبنى في مرحلتها، ولا تُعرض فيه أي بيانات الآن.
      </p>
    </section>
  );
}
