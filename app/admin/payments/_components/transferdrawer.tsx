"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Money } from "../../reports/_components/parts";
import { fmtMoney } from "../../reports/_lib/utils";
import { reviewTransferAction } from "../review-actions";
import { getProofUrl } from "../proof-action";
import { fmtDateTime, statusInfo } from "../_lib/format";
import type { Notice, TransferRow } from "../_lib/types";

type ProofState = "loading" | "ready" | "none" | "failed";
type Mode = null | "approve" | "reject";

function DrawerBody({
  row,
  onZoom,
  onResult,
}: {
  row: TransferRow;
  onZoom: (url: string) => void;
  onResult: (n: Notice) => void;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [proof, setProof] = useState<ProofState>(row.has_proof ? "loading" : "none");
  const [url, setUrl] = useState("");
  const [nonce, setNonce] = useState(0);
  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!row.has_proof) return;
    let alive = true;
    getProofUrl(row.id)
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setUrl(r.url);
          setProof("ready");
        } else setProof(r.reason === "none" ? "none" : "failed");
      })
      .catch(() => {
        if (alive) setProof("failed");
      });
    return () => {
      alive = false;
    };
  }, [row.id, row.has_proof, nonce]);

  function retry() {
    setProof("loading");
    setNonce((n) => n + 1);
  }

  const info = statusInfo(row);
  const pending = row.status === "pending";
  const room = row.room;
  const after = room === null ? null : room - row.amount;
  const orderClosed = row.order_status === "cancelled" || row.order_status === "returned";
  const canReview = pending && row.has_proof && !done;

  let blockMsg: string | null = null;
  if (canReview) {
    if (orderClosed) blockMsg = "الطلب ملغي أو مرجّع، فلا يمكن قبول تحويل عليه. يمكنك رفضه مع ذكر السبب.";
    else if (room === null || room <= 0)
      blockMsg = "لا يوجد متبقٍ قابل للدفع المباشر على هذا الطلب (مدفوع بالكامل أو مغطى بدين أو قسط).";
    else if (row.amount > room)
      blockMsg =
        row.debt_covered > 0
          ? "المبلغ المقدم يتجاوز المتبقي القابل للدفع المباشر لأن جزءًا من الطلب مغطى بدين أو قسط."
          : "المبلغ المقدم يتجاوز المتبقي على الطلب.";
  }

  const approveBlocked = !!blockMsg || (row.ref_dupes > 0 && !ack) || busy;
  const rejectBlocked = reason.trim().length < 3 || busy;

  async function submit() {
    if (lock.current || !mode) return;
    lock.current = true;
    setBusy(true);
    setErr(null);
    try {
      const r = await reviewTransferAction({ paymentId: row.id, decision: mode, reason, note, ackDup: ack });
      if (r.ok) {
        setDone(true);
        setMode(null);
        onResult({ tone: "ok", text: r.message });
        router.refresh();
      } else {
        setErr(r.message);
        if (r.refresh) router.refresh();
      }
    } catch {
      setErr("تعذّر الاتصال بالخادم. حدّث الصفحة وتحقق من حالة التحويل قبل المحاولة مرة أخرى.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function open(m: Exclude<Mode, null>) {
    setErr(null);
    setMode(m);
  }

  return (
    <>
      <div className="rp-card qp-section">
        <span className="qp-badge rp-tone" data-tone={info.tone}>
          {info.label}
        </span>
        <div className="rp-lines">
          <div className="rp-line-row">
            <span>الطلب</span>
            <Link className="qp-link" href={`/admin/orders/${row.order_id}`}>
              <bdi dir="ltr">{row.order_number}</bdi>
            </Link>
          </div>
          <div className="rp-line-row">
            <span>العميل</span>
            <b>{row.customer_name ?? "—"}</b>
          </div>
          {row.phone ? (
            <div className="rp-line-row">
              <span>الهاتف</span>
              <bdi dir="ltr">{row.phone}</bdi>
            </div>
          ) : null}
          <div className="rp-line-row">
            <span>إجمالي الطلب</span>
            <Money value={row.order_total} />
          </div>
          <div className="rp-line-row">
            <span>المدفوع سابقًا (دون هذا التحويل)</span>
            <Money value={row.paid_before} />
          </div>
          {pending ? (
            <div className="rp-line-row">
              <span>المتبقي القابل للدفع المباشر</span>
              <Money value={room} />
            </div>
          ) : null}
          <div className="rp-line-row" data-strong="true">
            <span>المبلغ المقدم</span>
            <Money value={row.amount} />
          </div>
          <div className="rp-line-row">
            <span>مرجع التحويل</span>
            <bdi dir="ltr">{row.provider_reference ?? "—"}</bdi>
          </div>
          <div className="rp-line-row">
            <span>وقت التقديم</span>
            <span>{fmtDateTime(row.submitted_at ?? row.created_at)}</span>
          </div>
          {row.reviewed_at ? (
            <div className="rp-line-row">
              <span>وقت المراجعة</span>
              <span>{fmtDateTime(row.reviewed_at)}</span>
            </div>
          ) : null}
          {row.reviewed_at && row.reviewer_name ? (
            <div className="rp-line-row">
              <span>راجعه</span>
              <b>{row.reviewer_name}</b>
            </div>
          ) : null}
          {row.review_note ? (
            <div className="rp-line-row">
              <span>ملاحظة الإدارة</span>
              <span>{row.review_note}</span>
            </div>
          ) : null}
        </div>
        {row.status === "failed" && row.reject_reason ? (
          <p className="qp-alert" role="status">
            سبب الرفض (يراه الزبون): {row.reject_reason}
          </p>
        ) : null}
        {blockMsg ? (
          <p className="rp-warnbox" role="status">
            {blockMsg}
          </p>
        ) : null}
        {pending && row.debt_covered > 0 ? (
          <p className="rp-warnbox" role="status">
            جزء من هذا الطلب ({fmtMoney(row.debt_covered)}) مغطى بدين أو قسط، فلا يُحسب ضمن المتبقي القابل للدفع المباشر. سداد الدين نفسه
            يُسجَّل من قسم الديون ولا يُسجَّل هنا حتى لا يُحتسب مرتين.
          </p>
        ) : null}
        {row.ref_dupes > 0 ? (
          <p className="rp-warnbox" role="status">
            نفس المرجع مسجل في {row.ref_dupes} تحويل آخر. هذا تنبيه للمراجعة وليس إثباتًا للتكرار.
          </p>
        ) : null}
      </div>

      <div className="rp-card qp-section">
        <h3 className="rp-h2" style={{ margin: 0 }}>
          إثبات التحويل
        </h3>
        {proof === "loading" ? <div className="rp-skel" style={{ height: 180 }} aria-busy="true" /> : null}
        {proof === "ready" ? (
          <button type="button" className="qp-proofbtn" onClick={() => onZoom(url)} aria-label="تكبير صورة الإثبات">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="إيصال التحويل" referrerPolicy="no-referrer" onError={() => setProof("failed")} />
          </button>
        ) : null}
        {proof === "failed" ? (
          <div className="rp-empty" role="alert">
            <p>تعذّر عرض الإثبات.</p>
            <button type="button" className="rp-btn" onClick={retry}>
              إعادة المحاولة
            </button>
          </div>
        ) : null}
        {proof === "none" ? <p className="rp-note">لم يرفع الزبون إثباتًا لهذا التحويل بعد.</p> : null}
        <p className="rp-note">صورة الإثبات وحدها لا تثبت وصول المبلغ. تحقق من حساب الاستلام قبل القبول.</p>
      </div>

      {canReview && mode === null ? (
        <div className="rp-card qp-review">
          <div className="rp-actions">
            <button type="button" className="rp-btn rp-btn--solid" onClick={() => open("approve")}>
              قبول التحويل
            </button>
            <button type="button" className="rp-btn" onClick={() => open("reject")}>
              رفض التحويل
            </button>
          </div>
        </div>
      ) : null}

      {canReview && mode === "approve" ? (
        <section className="rp-card qp-confirm" aria-label="تأكيد استلام التحويل">
          <h3 className="rp-h2" style={{ margin: 0 }}>
            تأكيد استلام التحويل
          </h3>
          <div className="rp-lines">
            <div className="rp-line-row">
              <span>الطلب</span>
              <bdi dir="ltr">{row.order_number}</bdi>
            </div>
            <div className="rp-line-row" data-strong="true">
              <span>المبلغ الذي سيُسجَّل</span>
              <Money value={row.amount} />
            </div>
            <div className="rp-line-row">
              <span>المتبقي قبل العملية</span>
              <Money value={room} />
            </div>
            <div className="rp-line-row">
              <span>المتبقي بعد العملية</span>
              <Money value={after !== null && after >= 0 ? after : null} />
            </div>
          </div>
          <label className="rp-field">
            مصدر التحقق أو ملاحظة (اختيارية، داخلية ولا يراها الزبون)
            <input className="rp-input" value={note} maxLength={300} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
          </label>
          {row.ref_dupes > 0 ? (
            <label className="qp-check">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              تحققت أن المرجع المكرر ليس تكرارًا لدفعة أخرى
            </label>
          ) : null}
          {err ? (
            <p className="qp-alert" role="alert">
              {err}
            </p>
          ) : null}
          <div className="rp-actions">
            <button type="button" className="rp-btn rp-btn--solid" disabled={approveBlocked} onClick={submit}>
              {busy ? "جارٍ التنفيذ…" : "تأكيد الاستلام"}
            </button>
            <button type="button" className="rp-btn" disabled={busy} onClick={() => setMode(null)}>
              رجوع
            </button>
          </div>
          <p className="rp-note" style={{ margin: 0 }}>
            يُسجَّل المبلغ مرة واحدة. لا تتغير حالة تجهيز الطلب أو تسليمه بسبب الدفع.
          </p>
        </section>
      ) : null}

      {canReview && mode === "reject" ? (
        <section className="rp-card qp-confirm" aria-label="رفض التحويل">
          <h3 className="rp-h2" style={{ margin: 0 }}>
            رفض التحويل
          </h3>
          <label className="rp-field">
            سبب الرفض (مطلوب، ويراه الزبون)
            <input className="rp-input" value={reason} maxLength={300} autoComplete="off" onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="rp-field">
            ملاحظة داخلية (اختيارية، لا يراها الزبون)
            <input className="rp-input" value={note} maxLength={300} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
          </label>
          {err ? (
            <p className="qp-alert" role="alert">
              {err}
            </p>
          ) : null}
          <div className="rp-actions">
            <button type="button" className="rp-btn rp-btn--solid" disabled={rejectBlocked} onClick={submit}>
              {busy ? "جارٍ التنفيذ…" : "تأكيد الرفض"}
            </button>
            <button type="button" className="rp-btn" disabled={busy} onClick={() => setMode(null)}>
              رجوع
            </button>
          </div>
          <p className="rp-note" style={{ margin: 0 }}>
            لا تُسجَّل أي دفعة، ولا يُلغى الطلب تلقائيًا.
          </p>
        </section>
      ) : null}
    </>
  );
}

export default function TransferDrawer({
  row,
  onClose,
  onResult,
}: {
  row: TransferRow | null;
  onClose: () => void;
  onResult: (n: Notice) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const open = !!row;

  const close = useCallback(() => {
    setZoom(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (zoom) setZoom(null);
      else close();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, zoom, close]);

  return (
    <>
      <AnimatePresence>
        {row && (
          <motion.div key="scrim" className="rp-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
        )}
        {row && (
          <motion.aside
            key="drawer"
            className="rp-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`تفاصيل التحويل ${row.payment_number}`}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22 }}
          >
            <div className="rp-drawer-head">
              <div>
                <h2 className="rp-h2" style={{ margin: 0 }}>
                  تحويل <bdi dir="ltr">{row.payment_number}</bdi>
                </h2>
                <p className="rp-note" style={{ margin: "4px 0 0" }}>
                  طلب رقم <bdi dir="ltr">{row.order_number}</bdi>
                </p>
              </div>
              <button ref={closeRef} type="button" className="rp-btn" onClick={close} aria-label="إغلاق">
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="rp-drawer-body">
              <DrawerBody key={row.id} row={row} onZoom={setZoom} onResult={onResult} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      {open && zoom ? (
        <div className="qp-zoom" role="dialog" aria-modal="true" aria-label="صورة الإثبات مكبّرة" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="إيصال التحويل" referrerPolicy="no-referrer" />
          <button type="button" className="rp-btn" onClick={() => setZoom(null)} aria-label="إغلاق التكبير">
            <X size={18} aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );
}
