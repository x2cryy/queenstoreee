import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { getRole } from "../../../../lib/auth/session";
import { formatMoney } from "../../../../lib/admin/format";
import {
  INST_PAGE_SIZE,
  INST_STATUS_LABEL,
  SCOPE_LABEL,
  getInstSummary,
  listInstallmentsPage,
  parseInstFilters,
} from "../../../../lib/finance/installments";
import { listCustomersForPicker } from "../../../../lib/finance/store";
import { DIR_LABEL, STORE_DIR_LABEL, todayIQ } from "../../../../lib/finance/debt-labels";
import CreatePlan from "./CreatePlan";

export const dynamic = "force-dynamic";

type SP = { q?: string; scope?: string; dir?: string; s?: string; p?: string; tab?: string };
const BASE = "/admin/debts/installments";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["installments"]);
  const sp = await searchParams;
  // Old notification links used ?tab=payments
  if (sp.tab === "payments") redirect("/admin/debts/payments");
  const f = parseInstFilters(sp);
  const today = todayIQ();
  const isOwner = (await getRole()) === "owner";
  const [list, sum, customers] = await Promise.all([
    listInstallmentsPage(f),
    getInstSummary(f.scope),
    listCustomersForPicker(),
  ]);
  const pages = Math.max(1, Math.ceil(list.total / INST_PAGE_SIZE));

  function href(next: { q?: string; scope?: string; dir?: string; s?: string; p?: number }) {
    const v = { q: f.q, scope: f.scope as string, dir: f.dir as string, s: f.s as string, ...next };
    const u = new URLSearchParams();
    if (v.q) u.set("q", v.q);
    if (v.scope) u.set("scope", v.scope);
    if (v.dir) u.set("dir", v.dir);
    if (v.s) u.set("s", v.s);
    if (next.p && next.p > 1) u.set("p", String(next.p));
    const t = u.toString();
    return BASE + (t ? "?" + t : "");
  }

  const hasFilters = !!(f.q || f.scope || f.dir || f.s);
  const chips: { label: string; clear: string }[] = [];
  if (f.q) chips.push({ label: "بحث: " + f.q, clear: href({ q: "" }) });
  if (f.scope) chips.push({ label: "النطاق: " + SCOPE_LABEL[f.scope], clear: href({ scope: "" }) });
  if (f.dir) chips.push({ label: "الاتجاه: " + (f.dir === "receivable" ? "لي / للمتجر" : "عليّ / على المتجر"), clear: href({ dir: "" }) });
  if (f.s) chips.push({ label: "الحالة: " + INST_STATUS_LABEL[f.s], clear: href({ s: "" }) });

  return (
    <section className="qd-page">
      <header className="qd-head">
        <div>
          <h1 className="qs-h1">الأقساط</h1>
          <p className="qs-muted">خطط الأقساط الشخصية وخطط المتجر، بنطاق واتجاه استحقاق منفصلين</p>
        </div>
        <div className="qd-actions"><CreatePlan customers={customers} isOwner={isOwner} /></div>
      </header>

      {sum ? (
        <div className="qd-sum">
          <Link className="qd-stat" href={href({ q: "", dir: "", s: "active" })} data-active={!f.dir && f.s === "active"}>
            <span className="qd-stat-label">خطط نشطة</span>
            <span className="qd-stat-value">{sum.active_plans} خطة</span>
            <span className="qd-stat-hint">{f.scope ? SCOPE_LABEL[f.scope] : "شخصي ومتجر"}</span>
          </Link>
          <Link className="qd-stat" href={href({ q: "", dir: "receivable", s: "active" })} data-active={f.dir === "receivable" && f.s === "active"}>
            <span className="qd-stat-label">المتبقي لي / للمتجر</span>
            <span className="qd-stat-value">{formatMoney(sum.remaining_receivable)}</span>
            <span className="qd-stat-hint">أقساط لم تُسدَّد بعد</span>
          </Link>
          <Link className="qd-stat" href={href({ q: "", dir: "payable", s: "active" })} data-active={f.dir === "payable" && f.s === "active"}>
            <span className="qd-stat-label">المتبقي عليّ / على المتجر</span>
            <span className="qd-stat-value">{formatMoney(sum.remaining_payable)}</span>
            <span className="qd-stat-hint">أقساط لم تُسدَّد بعد</span>
          </Link>
          <div className="qd-stat">
            <span className="qd-stat-label">مستحق لنا خلال 30 يومًا</span>
            <span className="qd-stat-value">{formatMoney(sum.due_receivable)}</span>
            <span className="qd-stat-hint">مستحق علينا: {formatMoney(sum.due_payable)}</span>
          </div>
          <Link className="qd-stat" href={href({ q: "", dir: "", s: "late" })} data-active={!f.dir && f.s === "late"} data-tone={sum.overdue_count > 0 ? "danger" : undefined}>
            <span className="qd-stat-label">أقساط متأخرة</span>
            <span className="qd-stat-value">{sum.overdue_count} قسط</span>
            <span className="qd-stat-hint">لنا {formatMoney(sum.overdue_receivable)} · علينا {formatMoney(sum.overdue_payable)}</span>
          </Link>
        </div>
      ) : (
        <div className="qd-msg" data-tone="err" role="alert">
          تعذر تحميل الملخص. <Link href={href({ p: f.page })}>إعادة المحاولة</Link>
        </div>
      )}

      <form className="qd-filters" method="get" action={BASE}>
        <input className="qd-input" name="q" defaultValue={f.q} placeholder="بحث باسم الطرف أو عنوان الخطة" aria-label="بحث" />
        <select className="qd-input" name="scope" defaultValue={f.scope} aria-label="النطاق">
          <option value="">كل النطاقات</option>
          <option value="store">متجر</option>
          {isOwner ? <option value="personal">شخصي</option> : null}
        </select>
        <select className="qd-input" name="dir" defaultValue={f.dir} aria-label="الاتجاه">
          <option value="">كل الاتجاهات</option>
          <option value="receivable">لي / للمتجر</option>
          <option value="payable">عليّ / على المتجر</option>
        </select>
        <select className="qd-input" name="s" defaultValue={f.s} aria-label="الحالة">
          <option value="">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="late">متأخرة</option>
          <option value="completed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <button type="submit" className="qd-btn">تطبيق</button>
      </form>

      {hasFilters ? (
        <div className="qd-chips">
          {chips.map((c) => (
            <Link key={c.label} className="qd-chip" href={c.clear} aria-label={"إزالة " + c.label}>{c.label}<X size={14} /></Link>
          ))}
          <Link className="qd-chip" href={BASE}>مسح الفلاتر</Link>
        </div>
      ) : null}

      {list.error ? (
        <div className="qd-msg" data-tone="err" role="alert">
          تعذر تحميل الخطط. <Link href={href({ p: f.page })}>إعادة المحاولة</Link>
        </div>
      ) : list.total === 0 ? (
        <div className="qd-empty">
          {hasFilters ? "لا توجد نتائج مطابقة للفلاتر." : "لا توجد خطط أقساط بعد. استخدم «إنشاء خطة أقساط» لإضافة أول خطة."}
        </div>
      ) : (
        <>
          <div className="qd-count">{list.total} نتيجة</div>
          <div className="qd-list">
            {list.rows.map((r) => {
              const st = r.status === "active" && r.next_due && r.next_due < today ? "late" : r.status;
              const tone = st === "completed" ? "paid" : st === "late" ? "late" : st === "cancelled" ? "cancelled" : "active";
              const dirLabel = (r.scope === "personal" ? DIR_LABEL : STORE_DIR_LABEL)[r.direction];
              return (
                <Link key={r.id} href={BASE + "/" + r.id} className="qd-row" data-kind="inst">
                  <div className="qd-cell qd-cell-main">
                    <b>{r.party_name}</b>
                    <span className="qd-sub">{r.title}</span>
                  </div>
                  <div className="qd-cell"><small>النطاق</small><span className="qd-badge">{SCOPE_LABEL[r.scope]}</span></div>
                  <div className="qd-cell"><small>الاتجاه</small><span className="qd-badge" data-tone={r.direction}>{dirLabel}</span></div>
                  <div className="qd-cell"><small>إجمالي الخطة</small><span>{formatMoney(Number(r.gross_total))}</span></div>
                  <div className="qd-cell"><small>المسدد</small><span>{formatMoney(Number(r.down_payment) + Number(r.paid_amount))}</span></div>
                  <div className="qd-cell"><small>المتبقي</small><b>{formatMoney(Number(r.remaining_amount))}</b></div>
                  <div className="qd-cell"><small>القسط القادم</small><span>{r.next_due ? r.next_due + " · " + formatMoney(r.next_amount ?? 0) : "لا يوجد"}</span></div>
                  <div className="qd-cell"><small>الحالة</small><span className="qd-badge" data-tone={tone}>{INST_STATUS_LABEL[st] ?? st}</span></div>
                  <span className="qd-open">فتح التفاصيل <ChevronLeft size={16} /></span>
                </Link>
              );
            })}
          </div>
          {pages > 1 ? (
            <div className="qd-pager">
              {f.page > 1 ? <Link className="qd-btn" href={href({ p: f.page - 1 })}>السابق</Link> : <span />}
              <span className="qd-count">صفحة {f.page} من {pages}</span>
              {f.page < pages ? <Link className="qd-btn" href={href({ p: f.page + 1 })}>التالي</Link> : <span />}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
