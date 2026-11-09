"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addNoteAction, deleteNoteAction } from "../_notes_actions";

export function NoteForm({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(addNoteAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
      <input type="hidden" name="customer_id" value={customerId} />
      <textarea
        className="ds-input"
        name="body"
        rows={3}
        maxLength={2000}
        required
        placeholder="اكتب ملاحظة عن الزبون"
        style={{ width: "100%", resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ds-btn ds-btn-gold" type="submit" disabled={pending}>
          <Plus size={16} /> {pending ? "جارٍ الحفظ" : "إضافة ملاحظة"}
        </button>
        {state && <span className={"qa-note " + (state.ok ? "qa-ok" : "qa-err")}>{state.message}</span>}
      </div>
    </form>
  );
}

export function DeleteNote({ id, customerId }: { id: string; customerId: string }) {
  const [state, action, pending] = useActionState(deleteNoteAction, null);
  return (
    <form action={action} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="customer_id" value={customerId} />
      <button className="ds-btn" type="submit" disabled={pending} aria-label="حذف الملاحظة">
        <Trash2 size={16} />
      </button>
      {state && !state.ok && <span className="qa-note qa-err">{state.message}</span>}
    </form>
  );
}
