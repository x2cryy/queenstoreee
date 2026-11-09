"use client";

import { useRef, useState, type FormEvent } from "react";
import { newIdem } from "../../../../lib/finance/types";

// Calls the server action from the submit handler (no effects, no form reset on failure).
// The idempotency key is created at submit time (never during render) and reused for retries
// of the same attempt; it is cleared only after a successful save.
export function useFormAction<S extends { ok: boolean; message: string }>(
  action: (prev: S | null, f: FormData) => Promise<S | null>,
  onDone?: (s: S) => void,
) {
  const [state, setState] = useState<S | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const idem = useRef<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const fd = new FormData(e.currentTarget);
    if (!idem.current) idem.current = newIdem();
    fd.set("idem", idem.current);
    busy.current = true;
    setPending(true);
    try {
      const r = await action(null, fd);
      setState(r);
      if (r?.ok) idem.current = null;
      if (r && onDone) onDone(r);
    } catch {
      setState({ ok: false, message: "تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى." } as S);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { state, pending, onSubmit };
}
