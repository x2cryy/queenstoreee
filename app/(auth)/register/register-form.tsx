"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "../actions";
import { initialFormState } from "../../../lib/auth/types";
import { Field } from "../../_components/auth/Field";
import { Notice } from "../../_components/auth/Notice";
import { SubmitButton } from "../../_components/auth/SubmitButton";

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initialFormState);

  if (state.ok) {
    return (
      <>
        <Notice kind="success">{state.message}</Notice>
        <Link href="/login" className="q-btn q-btn--ghost">الانتقال إلى تسجيل الدخول</Link>
      </>
    );
  }

  const v = state.values;
  return (
    <form action={action} noValidate>
      {state.message && <Notice kind="error">{state.message}</Notice>}
      <Field label="الاسم الكامل" name="full_name" autoComplete="name" required maxLength={80}
        defaultValue={v?.full_name} error={state.fieldErrors?.full_name} />
      <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" ltr required
        defaultValue={v?.email} error={state.fieldErrors?.email} />
      <Field label="رقم الهاتف (اختياري)" name="phone" type="tel" autoComplete="tel" ltr
        defaultValue={v?.phone} error={state.fieldErrors?.phone} />
      <Field label="كلمة المرور" name="password" type="password" autoComplete="new-password" ltr required
        hint="8 أحرف على الأقل، وتحتوي على حروف وأرقام." error={state.fieldErrors?.password} />
      <Field label="تأكيد كلمة المرور" name="confirm" type="password" autoComplete="new-password" ltr required
        error={state.fieldErrors?.confirm} />
      <SubmitButton pendingText="جارٍ إنشاء الحساب">إنشاء الحساب</SubmitButton>
      <p className="q-links">
        <span>لديك حساب بالفعل؟</span>
        <Link href="/login">تسجيل الدخول</Link>
      </p>
    </form>
  );
}
