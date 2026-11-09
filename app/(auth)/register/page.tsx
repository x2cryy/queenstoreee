import { redirect } from "next/navigation";
import { getUser } from "../../../lib/auth/session";
import { RegisterForm } from "./register-form";

export const metadata = { title: "إنشاء حساب | QUEEN STORE" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/account");
  return (
    <>
      <h1>إنشاء حساب</h1>
      <p className="q-lead">أنشئ حسابك لتتابع طلباتك وتحفظ بياناتك. تصفّح المتجر لا يحتاج إلى حساب.</p>
      <RegisterForm />
    </>
  );
}
