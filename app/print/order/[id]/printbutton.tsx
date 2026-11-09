"use client";

export default function PrintButton() {
  return (
    <button type="button" className="qp-btn" onClick={() => window.print()}>
      طباعة
    </button>
  );
}
