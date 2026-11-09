"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const Ctx = createContext<() => void>(() => {});
export const useModalClose = () => useContext(Ctx);

export function Modal({
  trigger,
  title,
  tone = "ghost",
  children,
}: {
  trigger: string;
  title: string;
  tone?: "ghost" | "primary" | "danger";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className={"qd-btn qd-btn-" + tone} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="qd-dialog"
        dir="rtl"
        aria-label={title}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        <div className="qd-dialog-body">
          <div className="qd-dialog-head">
            <h2>{title}</h2>
            <button type="button" className="qd-icon" aria-label="إغلاق" onClick={close}>
              <X size={18} />
            </button>
          </div>
          <Ctx.Provider value={close}>{children}</Ctx.Provider>
        </div>
      </dialog>
    </>
  );
}
