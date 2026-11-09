import { redirect } from "next/navigation";
import { getUser } from "../../../lib/auth/session";
import { safeNext } from "../../../lib/auth/validation";
import { Notice } from "../../_components/auth/Notice";
import { LoginForm } from "./login-form";

export const metadata = { title: "تسجيل الدخول | QUEEN STORE" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getUser()) redirect(next);

  return (
    <>
      <h1>تسجيل الدخول</h1>
      <p className="q-lead">أهلاً بعودتك. سجّل الدخول لمتابعة طلباتك وحسابك.</p>
      {sp.notice === "password-updated" && (
        <Notice kind="success">تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.</Notice>
      )}
      {sp.error === "link" && (
        <Notice kind="error">الرابط غير صالح أو منتهي. حاول تسجيل الدخول أو اطلب رابطاً جديداً.</Notice>
      )}
      {sp.error === "blocked" && (
        <Notice kind="error">هذا الحساب محظور. تواصل مع إدارة المتجر.</Notice>
      )}
      <LoginForm next={next} />
    </>
  );
}
