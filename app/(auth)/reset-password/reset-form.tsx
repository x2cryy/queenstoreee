"use client";

import { useActionState } from "react";
import { updatePassword } from "../actions";
import { initialFormState } from "../../../lib/auth/types";
import { Field } from "../../_components/auth/Field";
import { Notice } from "../../_components/auth/Notice";
import { SubmitButton } from "../../_components/auth/SubmitButton";

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  return (
    <form action={action} noValidate>
      {state.message && <Notice kind="error">{state.message}</Notice>}
      <Field label="كلمة المرور الجديدة" name="password" type="password" autoComplete="new-password" ltr required
        hint="8 أحرف على الأقل، وتحتوي على حروف وأرقام." error={state.fieldErrors?.password} />
      <Field label="تأكيد كلمة المرور" name="confirm" type="password" autoComplete="new-password" ltr required
        error={state.fieldErrors?.confirm} />
      <SubmitButton pendingText="جارٍ الحفظ">حفظ كلمة المرور</SubmitButton>
    </form>
  );
}
