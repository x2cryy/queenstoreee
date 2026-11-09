"use client";

import { useCallback, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { Check, ChevronLeft, Clock, Info, Search, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PeriodPicker from "../../reports/_components/PeriodPicker";
import { Money } from "../../reports/_components/parts";
import { fmtMoney, fmtNum, formatDate, type Period } from "../../reports/_lib/utils";
import { PAGE_SIZE, type Notice, type StatusFilter, type TransferRow, type TransferSummary } from "../_lib/types";
import { fmtDateTime, statusInfo } from "../_lib/format";
import TransferDrawer from "./TransferDrawer";

type Props = {
  today: string;
  period: Period;
  status: StatusFilter;
  q: string;
  page: number;
  summary: TransferSummary | null;
  rows: TransferRow[];
  total: number;
  listError: string | null;
  notice: Notice;
  settings: ReactNode;
};

const STATUS_OPTS: { key: StatusFilter; label: string }[] = [
  { key: "", label: "الكل" },
  { key: "pending", label: "المعلّقة" },
  { key: "succeeded", label: "مؤكدة" },
  { key: "failed", label: "مرفوضة" },
];

const DATE_NOTE: Record<StatusFilter, string> = {
  "": "في «الكل» تظهر التحويلات المقدمة خلال الفترة مع كل ما ينتظر المراجعة.",
  pending: "المعلّقة تظهر كلها دون تقييد بالفترة.",
  succeeded: "المؤكدة تُحسب بتاريخ التأكيد داخل الفترة.",
  failed: "المرفوضة تُحسب بتاريخ الرفض داخل الفترة.",
};

function buildUrl(p: { period: Period; status: StatusFilter; q: string; page: number }) {
  const u = new URLSearchParams({ r: p.period.key });
  if (p.period.key === "custom") {
    u.set("from", p.period.from);
    u.set("to", p.period.to);
  }
  if (p.status) u.set("s", p.status);
  if (p.q) u.set("q", p.q);
  if (p.page > 1) u.set("p", String(p.page));
  return `/admin/payments?${u.toString()}`;
}

function Count({ n, unit }: { n: number; unit: string }) {
  return (
    <span className="rp-money">
      <bdi dir="ltr">{fmtNum(n)}</bdi>
      <span className="rp-unit">{unit}</span>
    </span>
  );
}

function Stat({ icon: Icon, title, note, children }: { icon: LucideIcon; title: string; note: string; children: ReactNode }) {
  return (
    <article className="rp-card">
      <div className="rp-kpi-top">
        <span className="rp-kpi-ico">
          <Icon size={18} aria-hidden />
        </span>
        {title}
      </div>
      <div className="rp-kpi-val">{children}</div>
      <p className="rp-note">{note}</p>
    </article>
  );
}

export default function TransfersClient({ today, period, status, q, page, summary, rows, total, listError, notice, settings }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Notice>(null);
  const banner = flash ?? notice;
  const closeDrawer = useCallback(() => setOpenId(null), []);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = rows.find((r) => r.id === openId) ?? null;
  const hasFilters = !!(status || q);

  const go = (next: { period?: Period; status?: StatusFilter; q?: string; page?: number }) => {
    setOpenId(null);
    setFlash(null);
    startTransition(() =>
      router.push(
        buildUrl({
          period: next.period ?? period,
          status: next.status ?? status,
          q: next.q ?? q,
          page: next.page ?? 1,
        }),
      ),
    );
  };

  const neverAny = !!summary && summary.total_all === 0 && !hasFilters;

  return (
    <MotionConfig reducedMotion="user">
      <div className="rp-root" dir="rtl">
        <div className="rp-body">
          <header className="rp-head">
            <div>
              <h1 className="rp-title">تحويلات كي كارد</h1>
              <p className="rp-desc">
                تحويلات للمراجعة: يرفع الزبون إثبات التحويل، وتتحقق الإدارة من استلام المبلغ ثم تؤكد أو ترفض.
              </p>
              <p className="rp-dates">
                الفترة: {formatDate(period.from)}
                {period.from !== period.to && ` إلى ${formatDate(period.to)}`}
              </p>
            </div>
            <div className="rp-tools">
              <PeriodPicker period={period} today={today} onApply={(p) => go({ period: p })} />
            </div>
          </header>

          {banner ? (
            banner.tone === "ok" ? (
              <p className="rp-calm" role="status">
                <Check size={18} aria-hidden /> {banner.text}
              </p>
            ) : (
              <p className="qp-alert" role="alert">
                {banner.text}
              </p>
            )
          ) : null}

          {summary ? (
            <div className="rp-kpis">
              <Stat
                icon={Clock}
                title="بانتظار المراجعة"
                note={`مبالغ مقدمة وغير مؤكدة: ${fmtMoney(summary.pending_review_amount)}${
                  summary.awaiting_proof > 0 ? `. و${fmtNum(summary.awaiting_proof)} تحويل لم يُرفع إثباته بعد.` : ""
                }`}
              >
                <Count n={summary.pending_review} unit="تحويل" />
              </Stat>
              <Stat icon={Check} title="مؤكدة خلال الفترة" note="تُحسب بتاريخ التأكيد.">
                <Count n={summary.confirmed_count} unit="تحويل" />
              </Stat>
              <Stat icon={X} title="مرفوضة خلال الفترة" note="تُحسب بتاريخ الرفض، ولا تدخل في المبالغ المؤكدة.">
                <Count n={summary.rejected_count} unit="تحويل" />
              </Stat>
              <Stat icon={Wallet} title="مبالغ مؤكدة خلال الفترة" note="تحويلات مؤكدة الاستلام فقط، دون المعلّقة أو المرفوضة.">
                <Money value={summary.confirmed_amount} />
              </Stat>
            </div>
          ) : (
            <section className="rp-card" role="alert">
              <div className="rp-empty">
                <Info size={28} aria-hidden />
                <p>
                  <b>تعذّر تحميل الملخص</b>
                </p>
                <p>لم نتمكن من جلب الأرقام، وليس معنى ذلك أنها صفر.</p>
                <button type="button" className="rp-btn" onClick={() => router.refresh()}>
                  إعادة المحاولة
                </button>
              </div>
            </section>
          )}

          <section className="rp-card qp-filters">
            <div className="rp-seg" role="group" aria-label="حالة التحويل">
              {STATUS_OPTS.map((o) => (
                <button key={o.key || "all"} type="button" aria-pressed={status === o.key} onClick={() => go({ status: o.key })}>
                  {o.label}
                </button>
              ))}
            </div>
            <form
              key={q}
              className="qp-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const v = String(new FormData(e.currentTarget).get("q") ?? "").trim().slice(0, 80);
                go({ q: v });
              }}
            >
              <input
                className="rp-input"
                name="q"
                defaultValue={q}
                maxLength={80}
                autoComplete="off"
                placeholder="رقم الطلب أو اسم العميل أو مرجع التحويل"
                aria-label="بحث في التحويلات"
              />
              <button type="submit" className="rp-btn">
                <Search size={18} aria-hidden /> بحث
              </button>
              {q ? (
                <button type="button" className="rp-btn" onClick={() => go({ q: "" })}>
                  مسح البحث
                </button>
              ) : null}
            </form>
            <p className="rp-note" style={{ margin: 0 }}>
              {DATE_NOTE[status]}
            </p>
          </section>

          <div className="qp-body" data-busy={busy} aria-busy={busy}>
            {listError ? (
              <section className="rp-card" role="alert">
                <div className="rp-empty">
                  <Info size={28} aria-hidden />
                  <p>
                    <b>تعذّر تحميل التحويلات</b>
                  </p>
                  <p>لم نتمكن من جلب القائمة، وليس معنى ذلك أنها فارغة.</p>
                  <p className="qp-msg" dir="ltr">
                    {listError}
                  </p>
                  <button type="button" className="rp-btn" onClick={() => router.refresh()}>
                    إعادة المحاولة
                  </button>
                </div>
              </section>
            ) : rows.length === 0 ? (
              <section className="rp-card">
                <div className="rp-empty">
                  <Wallet size={28} aria-hidden />
                  <p>
                    <b>{neverAny ? "لا توجد تحويلات كي كارد بعد" : "لا توجد نتائج مطابقة"}</b>
                  </p>
                  <p>
                    {neverAny
                      ? "تظهر هنا التحويلات عندما يرسل الزبائن إثبات التحويل من صفحة الدفع."
                      : "غيّر الفترة أو الحالة أو كلمة البحث."}
                  </p>
                  {hasFilters ? (
                    <button type="button" className="rp-btn" onClick={() => go({ status: "", q: "" })}>
                      مسح الفلاتر
                    </button>
                  ) : null}
                </div>
              </section>
            ) : (
              <div className="rp-stack">
                <p className="qp-count">{fmtNum(total)} نتيجة</p>
                <ul className="rp-list">
                  {rows.map((r) => {
                    const info = statusInfo(r);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="qp-row"
                          onClick={() => setOpenId(r.id)}
                          aria-label={`فتح تفاصيل التحويل ${r.payment_number} للطلب ${r.order_number}`}
                        >
                          <span className="qp-cell">
                            <small>الطلب</small>
                            <b>
                              <bdi dir="ltr">{r.order_number}</bdi>
                            </b>
                            <small>
                              سجل <bdi dir="ltr">{r.payment_number}</bdi>
                            </small>
                          </span>
                          <span className="qp-cell">
                            <small>العميل</small>
                            <span>{r.customer_name ?? "—"}</span>
                          </span>
                          <span className="qp-cell">
                            <small>المبلغ المقدم</small>
                            <b className="st-amt">{fmtMoney(r.amount)}</b>
                          </span>
                          <span className="qp-cell">
                            <small>وقت التقديم</small>
                            <span>{fmtDateTime(r.submitted_at ?? r.created_at)}</span>
                          </span>
                          <span className="qp-cell">
                            <small>الحالة</small>
                            <span className="qp-badge rp-tone" data-tone={info.tone}>
                              {info.label}
                            </span>
                          </span>
                          <span className="qp-cell">
                            <small>الإثبات</small>
                            <span>{r.has_proof ? "مرفق" : "لم يُرفع"}</span>
                          </span>
                          <span className="qp-open">
                            فتح التفاصيل <ChevronLeft size={16} aria-hidden />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {pages > 1 ? (
                  <div className="qp-pager">
                    <button type="button" className="rp-btn" disabled={page <= 1 || busy} onClick={() => go({ page: page - 1 })}>
                      السابق
                    </button>
                    <span className="qp-count">
                      صفحة {fmtNum(page)} من {fmtNum(pages)}
                    </span>
                    <button type="button" className="rp-btn" disabled={page >= pages || busy} onClick={() => go({ page: page + 1 })}>
                      التالي
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {settings}
        </div>

        <TransferDrawer row={selected} onClose={closeDrawer} onResult={setFlash} />
      </div>
    </MotionConfig>
  );
}
