export default function Loading() {
  return (
    <div className="qm-wrap" style={{ paddingTop: 24 }} aria-busy="true">
      <div className="qm-pdp">
        <div className="qm-skel" style={{ aspectRatio: "4/5" }} />
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="qm-skel" style={{ aspectRatio: "auto", height: 34, width: "70%" }} />
          <div className="qm-skel" style={{ aspectRatio: "auto", height: 28, width: "35%" }} />
          <div className="qm-skel" style={{ aspectRatio: "auto", height: 120 }} />
          <div className="qm-skel" style={{ aspectRatio: "auto", height: 50 }} />
        </div>
      </div>
    </div>
  );
}
