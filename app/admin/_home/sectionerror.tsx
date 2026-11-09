import { Info } from "lucide-react";
import Retry from "./Retry";

export default function SectionError({ title }: { title: string }) {
  return (
    <section className="hp-card" role="alert">
      <div className="hp-card-head">
        <h2 className="hp-h2">{title}</h2>
      </div>
      <div className="hp-empty">
        <Info size={28} aria-hidden />
        <p>تعذّر تحميل هذا القسم.</p>
        <Retry />
      </div>
    </section>
  );
}
