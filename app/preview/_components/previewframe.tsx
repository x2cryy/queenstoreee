"use client";

import type { ReactNode } from "react";

// The preview is read-only: no navigation, no cart actions, no form submits.
export default function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div
      onClickCapture={(e) => {
        if ((e.target as Element).closest("a, button, summary, [role='button']")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onSubmitCapture={(e) => e.preventDefault()}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter" && (e.target as Element).closest("form")) e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
