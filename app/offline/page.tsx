export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main dir="rtl" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px", background: "#1a1512", color: "#f6efe6", textAlign: "center" }}>
      <div style={{ maxWidth: 360 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="QUEEN STORE" width={96} height={96} style={{ borderRadius: 22, margin: "0 auto 20px" }} />
        <h1 style={{ fontSize: 22, color: "#b8935a", margin: "0 0 8px" }}>لا يوجد اتصال بالإنترنت</h1>
        <p style={{ opacity: 0.85, lineHeight: 1.8, margin: "0 0 20px" }}>
          تأكد من اتصالك ثم أعد المحاولة. لا يمكن إتمام الطلبات أو عرض بياناتك دون اتصال.
        </p>
        <a href="/" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 999, background: "#b8935a", color: "#1a1512", fontWeight: 700, textDecoration: "none" }}>
          إعادة المحاولة
        </a>
      </div>
    </main>
  );
}
