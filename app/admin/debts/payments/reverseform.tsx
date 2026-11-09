"use client";
import { useActionState } from "react";
import { reverseAction } from "../_rev_actions";

export function ReverseForm({ kind, id }: { kind: string; id: string }) {
  const [state, action, pending] = useActionState(reverseAction, null);
  return (
    <details className="qa-details">
      <summary>عكس الدفعة</summary>
      <form className="qa-form" action={action}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <label className="qa-label">سبب العكس</label>
        <input className="qa-input" name="reason" required />
        <button className="qa-btn qa-danger" disabled={pending}>{pending ? "جارٍ التنفيذ" : "تأكيد العكس"}</button>
        {state && <div className={"qa-note " + (state.ok ? "qa-ok" : "qa-err")}>{state.message}</div>}
      </form>
    </details>
  );
}
