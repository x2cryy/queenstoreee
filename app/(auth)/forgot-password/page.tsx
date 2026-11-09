import { Notice } from "../../_components/auth/Notice";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "استعادة كلمة المرور | QUEEN STORE" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <h1>استعادة كلمة المرور</h1>
      <p className="q-lead">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.</p>
      {sp.error === "link" && (
        <Notice kind="error">
          الرابط غير صالح أو منتهي. افتح الرابط من نفس المتصفح الذي طلبته منه، أو اطلب رابطاً جديداً.
        </Notice>
      )}
      <ForgotForm />
    </>
  );
}
