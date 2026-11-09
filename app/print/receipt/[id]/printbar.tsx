"use client";

export function PrintBar({ text }: { text: string }) {
  const wa = "https://wa.me/?text=" + encodeURIComponent(text);
  return (
    <div className="noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      <button onClick={() => window.print()} style={btn}>طباعة / حفظ PDF</button>
      <a href={wa} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>مشاركة واتساب</a>
      <a href="/admin/debts/receipts" style={{ ...btn, background: "#fff", color: "#17140F", border: "1px solid #B89B6A", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>رجوع</a>
    </div>
  );
}

const btn: React.CSSProperties = {
  minHeight: 46, padding: "0 16px", border: 0, borderRadius: 12,
  background: "#17140F", color: "#FBF7EF", font: "inherit", fontWeight: 600, cursor: "pointer",
};
