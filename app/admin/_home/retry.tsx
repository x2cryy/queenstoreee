"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function Retry() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="hp-btn hp-btn--solid" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? "جارٍ المحاولة…" : "إعادة المحاولة"}
    </button>
  );
}
