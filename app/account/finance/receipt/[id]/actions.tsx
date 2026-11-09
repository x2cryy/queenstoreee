"use client";

export function Actions({ text }: { text: string }) {
  const b: React.CSSProperties = {
    minHeight: 46, padding: "0 16px", border: 0, borderRadius: 12, background: "#17140F",
    color: "#FBF7EF", font: "inherit", fontWeight: 600, cursor: "pointer",
    textDecoration: "none", display: "inline-flex", alignItems: "center",
  };
  return (
    <div className="noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      <button onClick={() => window.print()} style={b}>طباعة / حفظ PDF</button>
      <a href={"https://wa.me/?text=" + encodeURIComponent(text)} target="_blank" rel="noopener noreferrer" style={b}>مشاركة واتساب</a>
      <a href="/account/finance" style={b}>رجوع</a>
    </div>
  );
}
