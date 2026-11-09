"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "queen-install-dismissed";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return !!t && Date.now() - t < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}
function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

const bar: React.CSSProperties = {
  position: "fixed",
  insetInline: 12,
  bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  zIndex: 9999,
  background: "#1a1512",
  color: "#f6efe6",
  border: "1px solid #b8935a",
  borderRadius: 16,
  padding: "12px 14px",
  boxShadow: "0 8px 30px rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  fontSize: 14,
  lineHeight: 1.7,
};
const primary: React.CSSProperties = {
  background: "#b8935a",
  color: "#1a1512",
  border: 0,
  borderRadius: 999,
  padding: "8px 18px",
  fontWeight: 700,
  cursor: "pointer",
};
const ghost: React.CSSProperties = {
  background: "transparent",
  color: "#f6efe6",
  border: 0,
  padding: "8px 10px",
  cursor: "pointer",
  opacity: 0.8,
};

export default function PwaClient() {
  const pathname = usePathname() || "/";
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hideInstall, setHideInstall] = useState(false);

  const busy = pathname.startsWith("/checkout");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
          });
        });
        const id = window.setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        window.addEventListener("beforeunload", () => window.clearInterval(id), { once: true });
      })
      .catch(() => {});

    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstallEvt(null);
      setShowIos(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const isIos =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) setShowIos(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!installEvt && !showIos) return;
    const t = setTimeout(() => {
      markDismissed();
      setHideInstall(true);
    }, 12000);
    return () => clearTimeout(t);
  }, [installEvt, showIos]);

  if (busy) return null;

  if (waiting) {
    return (
      <div role="status" style={bar}>
        <span style={{ flex: 1 }}>يتوفر إصدار جديد من المتجر.</span>
        <button style={primary} onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
          تحديث
        </button>
        <button style={ghost} onClick={() => setWaiting(null)}>لاحقاً</button>
      </div>
    );
  }

  if (hideInstall) return null;

  if (installEvt) {
    return (
      <div role="dialog" aria-label="تثبيت التطبيق" style={bar}>
        <span style={{ flex: 1 }}>ثبّت QUEEN STORE على جهازك للوصول السريع.</span>
        <button
          style={primary}
          onClick={async () => {
            await installEvt.prompt();
            const { outcome } = await installEvt.userChoice;
            if (outcome === "dismissed") markDismissed();
            setInstallEvt(null);
          }}
        >
          تثبيت
        </button>
        <button
          style={ghost}
          onClick={() => {
            markDismissed();
            setHideInstall(true);
          }}
        >
          ليس الآن
        </button>
      </div>
    );
  }

  if (showIos) {
    return (
      <div role="dialog" aria-label="إضافة إلى الشاشة الرئيسية" style={bar}>
        <span style={{ flex: 1 }}>
          لتثبيت التطبيق: اضغط زر المشاركة في Safari، ثم «إضافة إلى الشاشة الرئيسية».
        </span>
        <button
          style={ghost}
          onClick={() => {
            markDismissed();
            setHideInstall(true);
          }}
        >
          حسناً
        </button>
      </div>
    );
  }

  return null;
}
