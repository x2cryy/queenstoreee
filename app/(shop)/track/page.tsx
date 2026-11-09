import type { Metadata } from "next";
import TrackForm from "../../../components/shop/TrackForm";

export const metadata: Metadata = { title: "تتبع الطلب", robots: { index: false } };

export default function TrackPage() {
  return (
    <div className="qm-wrap qo-page">
      <div className="qm-pagehead">
        <h1>تتبع الطلب</h1>
      </div>
      <TrackForm />
    </div>
  );
}
