"use client";

import { useRouter } from "next/navigation";
import { Modal, useModalClose } from "./Modal";
import { useFormAction } from "./useFormAction";
import type { DebtResult } from "../../../../lib/finance/debt-result";

type Action = (prev: DebtResult | null, f: FormData) => Promise<DebtResult | null>;

export default function CancelDebt({ id, action, hint }: { id: string; action: Action; hint: string }) {
  return (
    <Modal trigger="إلغاء الدين" title="إلغاء الدين" tone="danger">
      <CancelForm id={id} action={action} hint={hint} />
    </Modal>
  );
}

function CancelForm({ id, action, hint }: { id: string; action: Action; hint: string }) {
  const router = useRouter();
  const close = useModalClose();
  const { state, pending, onSubmit } = useFormAction<DebtResult>(action, (r) => {
    if (r.ok) {
      close();
      router.refresh();
    }
  });
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <p>{hint}</p>
      {state && !state.ok ? (<div className="qd-msg" data-tone="err" role="alert">{state.message}</div>) : null}
      <div className="qd-actions">
        <button type="submit" className="qd-btn qd-btn-danger" disabled={pending}>{pending ? "جارٍ الإلغاء…" : "تأكيد الإلغاء"}</button>
        <button type="button" className="qd-btn" onClick={close}>تراجع</button>
      </div>
    </form>
  );
}
