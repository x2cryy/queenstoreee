"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/browser";
import { submitTransfer } from "../../app/(shop)/order/[token]/pay/actions";

type Props = {
  orderId: string;
  userId: string;
  recipientName: string;
  cardNumber: string;
  amountText: string;
  steps: string[];
  lastReject: string | null;
};

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const COPY_OK = "تم نسخ رقم البطاقة.";
const COPY_FAIL = "تعذّر النسخ، انسخ الرقم يدوياً.";

export default function QiTransfer({ orderId, userId, recipientName, cardNumber, amountText, steps, lastReject }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function copy() {
    const digits = cardNumber.replace(/\s/g, "");
    try {
      await navigator.clipboard.writeText(digits);
      setCopied(COPY_OK);
    } catch {
      try {
        const t = document.createElement("textarea");
        t.value = digits;
        t.style.position = "fixed";
        t.style.opacity = "0";
        document.body.appendChild(t);
        t.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(t);
        setCopied(ok ? COPY_OK : COPY_FAIL);
      } catch {
        setCopied(COPY_FAIL);
      }
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const file = fileRef.current?.files?.[0] ?? null;
    const ref = reference.trim();
    if (!file && !ref) {
      setMsg({ ok: false, text: "اكتب مرجع التحويل أو ارفع صورة الإيصال." });
      return;
    }
    if (file && !TYPES.includes(file.type)) {
      setMsg({ ok: false, text: "الصورة لازم تكون JPG أو PNG أو WEBP." });
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setMsg({ ok: false, text: "الصورة كبيرة، اختر صورة أصغر." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let path: string | null = null;
      if (file) {
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        path = `${userId}/${orderId}/${crypto.randomUUID()}.${ext}`;
        const up = await createClient().storage.from("transfer-proofs").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (up.error) {
          setMsg({ ok: false, text: "تعذّر رفع الصورة. حاول مرة ثانية." });
          return;
        }
      }
      const res = await submitTransfer({ orderId, reference: ref, proofPath: path });
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    } catch {
      setMsg({ ok: false, text: "حصل خطأ غير متوقع. حاول مرة ثانية." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="qo-card">
        <h2>بيانات التحويل</h2>
        {lastReject ? (
          <div className="qo-alert" role="alert">
            رُفض الإثبات السابق: {lastReject}. تقدر ترسل إثبات جديد.
          </div>
        ) : null}
        <p className="qo-hint">اسم المستلم</p>
        <p><strong>{recipientName}</strong></p>
        <p className="qo-hint" style={{ marginTop: 12 }}>رقم البطاقة</p>
        <p><strong dir="ltr" style={{ fontSize: 22, letterSpacing: 1 }}>{cardNumber}</strong></p>
        <p className="qo-hint" style={{ marginTop: 12 }}>المبلغ المطلوب تحويله</p>
        <p><strong>{amountText}</strong></p>
        <button type="button" className="qm-btn qm-btn-gold" style={{ width: "100%", marginTop: 14 }} onClick={copy}>
          نسخ رقم البطاقة
        </button>
        <p className="qo-hint" role="status" aria-live="polite" style={{ marginTop: 8 }}>{copied}</p>
      </section>

      <section className="qo-card">
        <h2>طريقة التحويل</h2>
        <ol style={{ paddingInlineStart: 22, display: "grid", gap: 8, margin: 0 }}>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="qo-hint" style={{ marginTop: 12 }}>
          المتجر لا يطلب PIN ولا كلمة مرور ولا رموز تحقق. لا ترسلها لأي أحد.
        </p>
      </section>

      <form className="qo-card" onSubmit={onSubmit} noValidate>
        <h2>تأكيد التحويل</h2>
        <div className="qo-field">
          <label htmlFor="qi-ref">مرجع التحويل (اختياري إذا رفعت الإيصال)</label>
          <input id="qi-ref" className="qo-input" dir="ltr" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="qo-field">
          <label htmlFor="qi-proof">صورة الإيصال</label>
          <input id="qi-proof" ref={fileRef} className="qo-input" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        {msg ? (
          msg.ok ? (
            <p className="qo-hint" role="status"><strong>{msg.text}</strong></p>
          ) : (
            <div className="qo-alert" role="alert">{msg.text}</div>
          )
        ) : null}
        <button type="submit" className="qm-btn qm-btn-gold qo-submit" disabled={busy} style={{ width: "100%", marginTop: 12 }}>
          {busy ? "جاري الإرسال..." : "تم التحويل، أرسل الإثبات"}
        </button>
        <p className="qo-hint" style={{ marginTop: 8 }}>
          الطلب ما يعتبر مدفوع إلا بعد مراجعة الإدارة وتأكيدها.
        </p>
      </form>
    </div>
  );
}
