import "../reports/reports.css";
import "./payments.css";
import { getMyPermissions, requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { QI_DEFAULT_STEPS } from "../../../lib/shop/qi";
import { resolvePeriod, todayISO, type RangeKey } from "../reports/_lib/utils";
import { saveQiSettings } from "./actions";
import TransfersClient from "./_components/TransfersClient";
import { PAGE_SIZE, toList, toSummary, type Notice, type StatusFilter } from "./_lib/types";

export const dynamic = "force-dynamic";

type SP = { s?: string; q?: string; p?: string; r?: string; from?: string; to?: string; ok?: string; err?: string; saved?: string };
type Cfg = { enabled?: boolean; recipient_name?: string; card_number?: string; steps?: string[] };

const ERR: Record<string, string> = {
  forbidden: "ما عندك صلاحية.",
  payment_not_found: "العملية غير موجودة.",
  already_reviewed: "هذه العملية تمت مراجعتها سابقًا.",
  amount_mismatch: "المبلغ لا يطابق إجمالي الطلب.",
  order_already_paid: "الطلب مدفوع مسبقًا.",
  order_closed: "الطلب ملغي أو مرجّع.",
  reason_required: "اكتب سبب الرفض.",
  invalid: "طلب غير صالح.",
  invalid_settings: "عند التفعيل: اسم المستلم ورقم البطاقة (أرقام فقط) مطلوبان.",
  save_failed: "تعذّر حفظ الإعدادات.",
};
const STATUS_KEYS = ["pending", "succeeded", "failed"];
const RANGE_KEYS = ["today", "7", "30", "month", "custom"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAnyPermission(["orders"]);
  const sp = await searchParams;
  const perms = await getMyPermissions();
  const canSettings = perms.includes("settings");

  const today = todayISO();
  const key = (RANGE_KEYS.includes(sp.r ?? "") ? sp.r : "30") as RangeKey;
  const period = resolvePeriod(key, today, sp.from, sp.to);
  const status = (STATUS_KEYS.includes(sp.s ?? "") ? sp.s : "") as StatusFilter;
  const q = String(sp.q ?? "").trim().slice(0, 80);
  let page = Math.min(10000, Math.max(1, Math.floor(Number(sp.p)) || 1));

  const sb = await createClient();
  const load = (pg: number) =>
    sb.rpc("qi7_list", {
      p_status: status || null,
      p_q: q || null,
      p_from: period.from,
      p_to: period.to,
      p_limit: PAGE_SIZE,
      p_offset: (pg - 1) * PAGE_SIZE,
    });

  const sumRes = await sb.rpc("qi7_summary", { p_from: period.from, p_to: period.to });
  let listRes = await load(page);
  let list = toList(listRes.data);
  // صفحة خارج النطاق (مثلاً بعد تغيير الفلاتر): نعود للصفحة الأولى
  if (!listRes.error && list.rows.length === 0 && page > 1) {
    page = 1;
    listRes = await load(1);
    list = toList(listRes.data);
  }
  const summary = sumRes.error ? null : toSummary(sumRes.data);
  const listError = listRes.error ? String(listRes.error.message ?? "").slice(0, 160) || "خطأ غير معروف" : null;

  let notice: Notice = null;
  if (sp.ok) notice = { tone: "ok", text: sp.ok === "approve" ? "تم قبول التحويل وتسجيل الدفع." : "تم رفض التحويل." };
  else if (sp.saved) notice = { tone: "ok", text: "تم حفظ الإعدادات." };
  else if (sp.err) notice = { tone: "err", text: ERR[sp.err] ?? "حصل خطأ، حاول مرة ثانية." };

  let settings: React.ReactNode = null;
  if (canSettings) {
    const { data: c } = await sb.from("site_settings").select("value").eq("key", "qi_transfer").maybeSingle();
    const cfg = ((c?.value ?? {}) as Cfg) || {};
    const steps = cfg.steps && cfg.steps.length ? cfg.steps : QI_DEFAULT_STEPS;
    settings = (
      <details className="rp-card qp-settings">
        <summary>إعدادات استلام التحويلات</summary>
        <form action={saveQiSettings} className="qp-form">
          <label className="rp-field">
            اسم صاحب البطاقة أو المتجر
            <input className="rp-input" name="recipient_name" defaultValue={cfg.recipient_name ?? ""} maxLength={80} />
          </label>
          <label className="rp-field">
            رقم بطاقة Qi Card المستلمة
            <input className="rp-input" name="card_number" dir="ltr" inputMode="numeric" defaultValue={cfg.card_number ?? ""} maxLength={25} />
          </label>
          <label className="rp-field">
            تعليمات التحويل (سطر لكل خطوة)
            <textarea className="rp-input" name="steps" rows={8} defaultValue={steps.join("\n")} />
          </label>
          <label className="qp-check">
            <input type="checkbox" name="enabled" defaultChecked={cfg.enabled === true} /> تفعيل التحويل عبر Qi Card في صفحة الدفع
          </label>
          <button type="submit" className="rp-btn rp-btn--solid">
            حفظ الإعدادات
          </button>
        </form>
      </details>
    );
  }

  return (
    <TransfersClient
      today={today}
      period={period}
      status={status}
      q={q}
      page={page}
      summary={summary}
      rows={list.rows}
      total={list.total}
      listError={listError}
      notice={notice}
      settings={settings}
    />
  );
}
