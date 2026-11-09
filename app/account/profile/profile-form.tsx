"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateProfile } from "./actions";
import type { FormState } from "../../../lib/auth/types";
import { Field } from "../../_components/auth/Field";
import { Notice } from "../../_components/auth/Notice";
import { SubmitButton } from "../../_components/auth/SubmitButton";

export function ProfileForm({
  email, fullName, phone,
}: { email: string; fullName: string; phone: string }) {
  const initial: FormState = { ok: false, values: { full_name: fullName, phone } };
  const [state, action] = useActionState(updateProfile, initial);
  const v = state.values;
  return (
    <form action={action} noValidate>
      {state.message && <Notice kind={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <Field label="الاسم الكامل" name="full_name" autoComplete="name" required maxLength={80}
        defaultValue={v?.full_name ?? fullName} error={state.fieldErrors?.full_name} />
      <Field label="رقم الهاتف" name="phone" type="tel" autoComplete="tel" ltr
        defaultValue={v?.phone ?? phone} error={state.fieldErrors?.phone} />
      <Field label="البريد الإلكتروني" name="email_display" type="email" ltr readOnly
        defaultValue={email} hint="لا يمكن تغيير البريد الإلكتروني من هذه الصفحة." />
      <SubmitButton pendingText="جارٍ الحفظ">حفظ التغييرات</SubmitButton>
      <p className="q-links"><Link href="/account">العودة إلى حسابي</Link></p>
    </form>
  );
}
