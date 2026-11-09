export default function Loading() {
  return (
    <div className="qm-wrap" style={{ paddingTop: 24 }} aria-busy="true">
      <div className="qm-skel" style={{ aspectRatio: "16/7", marginBottom: 32 }} />
      <div className="qm-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="qm-skel" />
        ))}
      </div>
    </div>
  );
}
