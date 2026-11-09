import Link from "next/link";
import { getUser } from "../../../lib/auth/session";
import { signOut } from "../actions";

export const metadata = { title: "الوصول غير مسموح | QUEEN STORE" };

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  const blocked = sp.reason === "blocked";
  return (
    <>
      <h1>{blocked ? "الحساب محظور" : "الوصول غير مسموح"}</h1>
      <p className="q-lead">
        {blocked
          ? "تم إيقاف هذا الحساب. تواصل مع إدارة المتجر إذا كنت تعتقد أن ذلك خطأ."
          : "ليست لديك صلاحية لفتح هذه الصفحة. إذا كنت بحاجة إليها، اطلب الصلاحية من مالكة المتجر."}
      </p>
      <div className="q-stack">
        <Link href="/" className="q-btn">العودة إلى المتجر</Link>
        {user && !blocked && <Link href="/account" className="q-btn q-btn--ghost">حسابي</Link>}
        {user && (
          <form action={signOut}>
            <button type="submit" className="q-btn q-btn--ghost">تسجيل الخروج</button>
          </form>
        )}
      </div>
    </>
  );
}
