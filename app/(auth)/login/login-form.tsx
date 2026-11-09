"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { initialFormState } from "../../../lib/auth/types";
import { Field } from "../../_components/auth/Field";
import { Notice } from "../../_components/auth/Notice";
import { SubmitButton } from "../../_components/auth/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initialFormState);
  return (
    <form action={action} noValidate>
      {state.message && <Notice kind="error">{state.message}</Notice>}
      <input type="hidden" name="next" value={next} />
      <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" ltr required
        defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <Field label="كلمة المرور" name="password" type="password" autoComplete="current-password" ltr required
        error={state.fieldErrors?.password} />
      <SubmitButton pendingText="جارٍ تسجيل الدخول">تسجيل الدخول</SubmitButton>
      <p className="q-links">
        <Link href="/forgot-password">نسيت كلمة المرور؟</Link>
        <Link href="/register">إنشاء حساب جديد</Link>
      </p>
    </form>
  );
}
