"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, updateCategory, type CatState } from "./actions";

function Msg({ s }: { s: CatState }) {
  return (
    <>
      {s.error ? <p role="alert" style={{ color: "var(--c-bad,#B91C1C)", fontWeight: 600, margin: 0 }}>{s.error}</p> : null}
      {s.ok ? <p role="status" style={{ color: "#15803D", fontWeight: 600, margin: 0 }}>{s.ok}</p> : null}
    </>
  );
}

export function CreateForm() {
  const [state, action, pending] = useActionState<CatState, FormData>(createCategory, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.n, state.ok]);
  return (
    <form ref={ref} action={action} className="ds-form">
      <div>
        <label className="ds-label" htmlFor="cat-name">اسم التصنيف</label>
        <input className="ds-input" id="cat-name" name="name" maxLength={60} required />
      </div>
      <div>
        <label className="ds-label" htmlFor="cat-img">صورة التصنيف (اختيارية)</label>
        <input className="ds-input" id="cat-img" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <Msg s={state} />
      <button type="submit" className="ds-btn ds-btn-gold" disabled={pending}>{pending ? "جارٍ الحفظ..." : "إضافة التصنيف"}</button>
    </form>
  );
}

export function EditForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<CatState, FormData>(updateCategory, {});
  return (
    <form action={action} className="ds-form">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="ds-label" htmlFor="cat-edit-name">اسم التصنيف</label>
        <input className="ds-input" id="cat-edit-name" name="name" defaultValue={name} maxLength={60} required />
      </div>
      <div>
        <label className="ds-label" htmlFor="cat-edit-img">صورة جديدة (اتركها فارغة للإبقاء على الحالية)</label>
        <input className="ds-input" id="cat-edit-img" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <Msg s={state} />
      <button type="submit" className="ds-btn ds-btn-gold" disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ التعديل"}</button>
    </form>
  );
}
