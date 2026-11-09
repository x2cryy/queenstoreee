import Link from "next/link";
import { safeNext } from "../../../lib/auth/validation";

export const metadata = { title: "انتهت الجلسة | QUEEN STORE" };

export default async function SessionExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <>
      <h1>انتهت الجلسة</h1>
      <p className="q-lead">لحماية حسابك، انتهت جلسة الدخول. سجّل الدخول من جديد للمتابعة من حيث توقفت.</p>
      <div className="q-stack">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="q-btn">تسجيل الدخول</Link>
        <Link href="/" className="q-btn q-btn--ghost">العودة إلى المتجر</Link>
      </div>
    </>
  );
}
