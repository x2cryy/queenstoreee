"use client";

import { useActionState } from "react";
import { setVisibility, type FormState } from "../actions";

export function VisibilityButton({ id, status }: { id: string; status: string }) {
  const [st, action, pending] = useActionState<FormState, FormData>(setVisibility, {});
  const hidden = status === "hidden";
  return (
    <form action={action} style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="target" value={hidden ? "active" : "hidden"} />
      <button type="submit" className={hidden ? "ds-btn ds-btn-gold" : "ds-btn"} disabled={pending}>
        {pending ? "جارٍ التنفيذ..." : hidden ? "نشر المنتج" : "إخفاء عن المتجر"}
      </button>
      {st.error ? <span role="alert" style={{ color: "var(--c-bad, #B91C1C)", fontSize: 13, fontWeight: 600 }}>{st.error}</span> : null}
      {st.ok ? <span role="status" style={{ color: "var(--c-good, #15803D)", fontSize: 13, fontWeight: 600 }}>{st.ok}</span> : null}
    </form>
  );
}
