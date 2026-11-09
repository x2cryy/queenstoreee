import st from "./inventory.module.css";

export default function Loading() {
  return (
    <section className={st.page} aria-busy="true">
      <div className={st.sk} style={{ height: 56 }} />
      <div className={st.kpis}>
        {[0, 1, 2, 3].map((i) => <div key={i} className={st.sk} style={{ height: 78 }} />)}
      </div>
      <div className={st.sk} style={{ height: 48 }} />
      <div className={st.grid}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className={st.sk} style={{ aspectRatio: "1 / 1" }} />)}
      </div>
    </section>
  );
}
