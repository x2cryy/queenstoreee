"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { initialFormState } from "../../../lib/auth/types";
import { Field } from "../../_components/auth/Field";
import { Notice } from "../../_components/auth/Notice";
import { SubmitButton } from "../../_components/auth/SubmitButton";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);

  if (state.ok) {
    return (
      <>
        <Notice kind="success">{state.message}</Notice>
        <Link href="/login" className="q-btn q-btn--ghost">العودة إلى تسجيل الدخول</Link>
      </>
    );
  }

  return (
    <form action={action} noValidate>
      {state.message && <Notice kind="error">{state.message}</Notice>}
      <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" ltr required
        defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <SubmitButton pendingText="جارٍ الإرسال">إرسال رابط الاستعادة</SubmitButton>
      <p className="q-links"><Link href="/login">العودة إلى تسجيل الدخول</Link></p>
    </form>
  );
}
