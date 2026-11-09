import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Cormorant_Garamond } from "next/font/google";
import "../_styles/queen-orders.css";
import { requireAnyPermission } from "../../lib/admin/access";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ar",
  display: "swap",
});
const corm = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPermission(["content"]);
  return <div className={`${plex.variable} ${corm.variable} qm`}>{children}</div>;
}
