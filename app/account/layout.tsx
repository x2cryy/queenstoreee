import "../_styles/queen-auth.css";
import "./account-extras.css";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="q-root" dir="rtl" lang="ar">
      <main className="q-card">
        <div className="q-brandbar">
          <p className="q-wordmark">QUEEN STORE</p>
        </div>
        <div className="q-body">{children}</div>
      </main>
    </div>
  );
}
