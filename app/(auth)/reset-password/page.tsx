import { redirect } from "next/navigation";
import { getUser } from "../../../lib/auth/session";
import { ResetForm } from "./reset-form";

export const metadata = { title: "تعيين كلمة مرور جديدة | QUEEN STORE" };

export default async function ResetPasswordPage() {
  // Only reachable through the emailed recovery link, which creates a temporary session.
  if (!(await getUser())) redirect("/forgot-password?error=link");
  return (
    <>
      <h1>تعيين كلمة مرور جديدة</h1>
      <p className="q-lead">اختر كلمة مرور جديدة لحسابك. ستحتاج إلى تسجيل الدخول بها بعد الحفظ.</p>
      <ResetForm />
    </>
  );
}
