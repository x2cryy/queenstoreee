import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { requireAnyPermission } from "../../../../lib/admin/access";
import { formatMoney } from "../../../../lib/admin/format";
import {
  STORE_PAGE_SIZE,
  getStoreSummary,
  listCustomersForPicker,
  listStoreDebtsPage,
  parseStoreFilters,
} from "../../../../lib/finance/store";
import { STATUS_LABEL, STORE_DIR_LABEL, effectiveStatus, todayIQ } from "../../../../lib/finance/debt-labels";
import CreateStoreDebt from "./CreateStoreDebt";

export const dynamic = "force-dynamic";

type SP = { q?: string; dir?: string; s?: string; src?: string; p?: string };
const BASE = "/admin/debts/store";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["store_debts"]);
  const f = parseStoreFilters(await searchParams);
  const today = todayIQ();
  const [list, sum, customers] = await Promise.all([listStoreDebtsPage(f, today), getStoreSummary(), listCustomersForPicker()]);
  const pages = Math.max(1, Math.ceil(list.total / STORE_PAGE_SIZE));

  function href(next: { q?: string; dir?: string; s?: string; src?: string; p?: number }) {
    const v = { q: f.q, dir: f.dir as string, s: f.s as string, src: f.src as string, ...next };
    const u = new URLSearchParams();
    if (v.q) u.set("q", v.q);
    if (v.dir) u.set("dir", v.dir);
    if (v.s) u.set("s", v.s);
    if (v.src) u.set("src", v.src);
    if (next.p && next.p > 1) u.set("p", String(next.p));
    const t = u.toString();
    return BASE + (t ? "?" + t : "");
  }

  const hasFilters = !!(f.q || f.dir || f.s || f.src);
  const chips: { label: string; clear: string }[] = [];
  if (f.q) chips.push({ label: "بحث: " + f.q, clear: href({ q: "" }) });
  if (f.dir) chips.push({ label: "النوع: " + STORE_DIR_LABEL[f.dir], clear: href({ dir: "" }) });
  if (f.src) chips.push({ label: "المصدر: " + (f.src === "order" ? "طلب" : "سجل يدوي"), clear: href({ src: "" }) });
  if (f.s) chips.push({ label: "الحالة: " + (f.s === "active" ? "مفتوحة" : STATUS_LABEL[f.s]), clear: href({ s: "" }) });

  return (
    <section className="qd-page">
      <header className="qd-head">
        <div>
          <h1 className="qs-h1">ديون المتجر</h1>
          <p className="qs-muted">ديون العملاء الناتجة عن الطلبات، وما يُسجَّل يدويًا للمتجر أو عليه</p>
        </div>
        <div className="qd-actions"><CreateStoreDebt customers={customers} /></div>
      </header>

      {sum ? (
        <div className="qd-sum">
          <Link className="qd-stat" href={href({ q: "", dir: "receivable", s: "active" })} data-active={f.dir === "receivable" && f.s === "active"}>
            <span className="qd-stat-label">مستحق للمتجر</span>
            <span className="qd-stat-value">{formatMoney(sum.receivable_remaining)}</span>
            <span className="qd-stat-hint">المتبقي بذمة العملاء والأطراف</span>
          </Link>
          <Link className="qd-stat" href={href({ q: "", dir: "payable", s: "active" })} data-active={f.dir === "payable" && f.s === "active"}>
            <span className="qd-stat-label">مستحق على المتجر</span>
            <span className="qd-stat-value">{formatMoney(sum.payable_remaining)}</span>
            <span className="qd-stat-hint">المتبقي على المتجر للآخرين</span>
          </Link>
          <Link className="qd-stat" href={href({ q: "", dir: "", s: "active" })} data-active={!f.dir && f.s === "active"}>
            <span className="qd-stat-label">الديون المفتوحة</span>
            <span className="qd-stat-value">{sum.open_count} سجل</span>
            <span className="qd-stat-hint">مفتوح أو مسدد جزئيًا</span>
          </Link>
          <Link className="qd-stat" href={href({ q: "", dir: "", s: "late" })} data-active={!f.dir && f.s === "late"} data-tone={sum.overdue_count > 0 ? "danger" : undefined}>
            <span className="qd-stat-label">ديون متأخرة</span>
            <span className="qd-stat-value">{sum.overdue_count} سجل</span>
            <span className="qd-stat-hint">للمتجر {formatMoney(sum.overdue_receivable)} · على المتجر {formatMoney(sum.overdue_payable)}</span>
          </Link>
        </div>
      ) : (
        <div className="qd-msg" data-tone="err" role="alert">
          تعذر تحميل الملخص. <Link href={href({ p: f.page })}>إعادة المحاولة</Link>
        </div>
      )}

      <form className="qd-filters" method="get" action={BASE}>
        <input className="qd-input" name="q" defaultValue={f.q} placeholder="بحث باسم الطرف أو السبب أو رقم الطلب" aria-label="بحث" />
        <select className="qd-input" name="dir" defaultValue={f.dir} aria-label="النوع">
          <option value="">كل الأنواع</option>
          <option value="receivable">للمتجر</option>
          <option value="payable">على المتجر</option>
        </select>
        <select className="qd-input" name="src" defaultValue={f.src} aria-label="المصدر">
          <option value="">كل المصادر</option>
          <option value="order">من طلب</option>
          <option value="manual">سجل يدوي</option>
        </select>
        <select className="qd-input" name="s" defaultValue={f.s} aria-label="الحالة">
          <option value="">كل الحالات</option>
          <option value="active">مفتوحة</option>
          <option value="open">مفتوح (بلا دفعات)</option>
          <option value="partial">مسدد جزئيًا</option>
          <option value="late">متأخر</option>
          <option value="paid">مسدد بالكامل</option>
          <option value="cancelled">ملغي</option>
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
          تعذر تحميل السجلات. <Link href={href({ p: f.page })}>إعادة المحاولة</Link>
        </div>
      ) : list.total === 0 ? (
        <div className="qd-empty">
          {hasFilters ? "لا توجد نتائج مطابقة للفلاتر." : "لا توجد ديون متجر بعد. تُنشأ ديون الطلبات من زر «حفظ كدين» داخل الطلب، أو استخدم «إنشاء دين»."}
        </div>
      ) : (
        <>
          <div className="qd-count">{list.total} نتيجة</div>
          <div className="qd-list">
            {list.rows.map((r) => {
              const st = effectiveStatus(r.status, r.due_date, today);
              return (
                <Link key={r.id} href={BASE + "/" + r.id} className="qd-row qd-row-store">
                  <div className="qd-cell qd-cell-main">
                    <b>{r.party_name}</b>
                    {r.reason ? <span className="qd-sub">{r.reason}</span> : null}
                  </div>
                  <div className="qd-cell"><small>المصدر</small>
                    <span>{r.order_id ? <>طلب <span dir="ltr">#{r.order_number ?? "…"}</span></> : "سجل يدوي"}</span>
                  </div>
                  <div className="qd-cell"><small>النوع</small><span className="qd-badge" data-tone={r.direction}>{STORE_DIR_LABEL[r.direction]}</span></div>
                  <div className="qd-cell"><small>المبلغ الأصلي</small><span>{formatMoney(Number(r.original_amount))}</span></div>
                  <div className="qd-cell"><small>المسدد</small><span>{formatMoney(Number(r.paid_amount))}</span></div>
                  <div className="qd-cell"><small>المتبقي</small><b>{formatMoney(Number(r.remaining_amount))}</b></div>
                  <div className="qd-cell"><small>الاستحقاق</small><span>{r.due_date ?? "غير محدد"}</span></div>
                  <div className="qd-cell"><small>الحالة</small><span className="qd-badge" data-tone={st}>{STATUS_LABEL[st] ?? st}</span></div>
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
