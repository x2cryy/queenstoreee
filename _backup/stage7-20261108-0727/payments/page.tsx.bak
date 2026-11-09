import { requireAnyPermission, getMyPermissions } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { formatDateTime, formatMoney } from "../../../lib/admin/format";
import { QI_DEFAULT_STEPS } from "../../../lib/shop/qi";
import { reviewTransfer, saveQiSettings } from "./actions";

export const dynamic = "force-dynamic";

type OrdRef = { order_number: string; customer_name: string; phone: string; total: number };
type Row = {
  id: string; payment_number: string; amount: number; status: string;
  provider_reference: string | null; proof_path: string | null;
  submitted_at: string | null; reviewed_at: string | null; reject_reason: string | null;
  order_id: string; orders: OrdRef | OrdRef[] | null;
};
type Cfg = { enabled?: boolean; recipient_name?: string; card_number?: string; steps?: string[] };

const ERR: Record<string, string> = {
  forbidden: "ما عندك صلاحية.",
  payment_not_found: "العملية غير موجودة.",
  already_reviewed: "هذه العملية تمت مراجعتها سابقاً.",
  amount_mismatch: "المبلغ لا يطابق إجمالي الطلب.",
  order_already_paid: "الطلب مدفوع مسبقاً.",
  order_closed: "الطلب ملغي أو مرجّع.",
  reason_required: "اكتب سبب الرفض.",
  invalid: "طلب غير صالح.",
  invalid_settings: "عند التفعيل: اسم المستلم ورقم البطاقة (أرقام فقط) مطلوبان.",
  save_failed: "تعذّر حفظ الإعدادات.",
};
const ST: Record<string, string> = { pending: "بانتظار المراجعة", succeeded: "مقبول", failed: "مرفوض" };
const btn = { padding: "8px 14px", borderRadius: 8, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" } as const;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; saved?: string }>;
}) {
  await requireAnyPermission(["orders"]);
  const sp = await searchParams;
  const perms = await getMyPermissions();
  const canSettings = perms.includes("settings");
  const sb = await createClient();

  const { data } = await sb
    .from("payments")
    .select("id, payment_number, amount, status, provider_reference, proof_path, submitted_at, reviewed_at, reject_reason, order_id, orders(order_number, customer_name, phone, total)")
    .eq("method", "qi_card")
    .order("submitted_at", { ascending: false })
    .limit(100);
  const rows = ((data ?? []) as unknown as Row[]);
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  const paths = rows.map((r) => r.proof_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await sb.storage.from("transfer-proofs").createSignedUrls(paths, 600);
    (signed ?? []).forEach((s) => { if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl); });
  }

  let cfg: Cfg = {};
  if (canSettings) {
    const { data: c } = await sb.from("site_settings").select("value").eq("key", "qi_transfer").maybeSingle();
    cfg = ((c?.value ?? {}) as Cfg) || {};
  }
  const steps = cfg.steps && cfg.steps.length ? cfg.steps : QI_DEFAULT_STEPS;
  const ord = (r: Row) => (Array.isArray(r.orders) ? r.orders[0] : r.orders) ?? null;

  const card = (r: Row, review: boolean) => {
    const o = ord(r);
    const url = r.proof_path ? urls.get(r.proof_path) : undefined;
    const mismatch = o ? Number(r.amount) !== Number(o.total) : false;
    return (
      <li key={r.id} className="ao-card" style={{ marginBottom: 12 }}>
        <p><strong dir="ltr">{o?.order_number ?? "-"}</strong> · {ST[r.status] ?? r.status}</p>
        <p className="ao-muted">{o?.customer_name} · <span dir="ltr">{o?.phone}</span></p>
        <p>المبلغ المحوّل: <strong>{formatMoney(Number(r.amount))}</strong>{o ? ` · إجمالي الطلب: ${formatMoney(Number(o.total))}` : ""}</p>
        {mismatch ? <p className="ao-err">المبلغ لا يطابق إجمالي الطلب، لا يمكن قبوله.</p> : null}
        <p className="ao-muted">
          {r.submitted_at ? `أُرسل: ${formatDateTime(r.submitted_at)}` : ""}
          {r.provider_reference ? ` · المرجع: ${r.provider_reference}` : ""}
        </p>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="إيصال التحويل" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, marginTop: 8 }} />
          </a>
        ) : r.proof_path ? <p className="ao-muted">تعذّر عرض الصورة.</p> : null}
        {r.status === "failed" && r.reject_reason ? <p className="ao-err">سبب الرفض: {r.reject_reason}</p> : null}
        {r.reviewed_at ? <p className="ao-muted">روجعت: {formatDateTime(r.reviewed_at)}</p> : null}
        {review ? (
          <form action={reviewTransfer} style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <input type="hidden" name="payment_id" value={r.id} />
            <input name="reason" maxLength={300} placeholder="سبب الرفض (مطلوب عند الرفض)" style={{ padding: 8, borderRadius: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" name="decision" value="approve" style={btn} disabled={mismatch}>قبول التحويل</button>
              <button type="submit" name="decision" value="reject" style={btn}>رفض</button>
            </div>
          </form>
        ) : null}
      </li>
    );
  };

  return (
    <section>
      <h1>تحويلات Qi Card</h1>
      {sp.ok ? <p><strong>{sp.ok === "approve" ? "تم قبول التحويل وتسجيل الدفع." : "تم رفض التحويل."}</strong></p> : null}
      {sp.saved ? <p><strong>تم حفظ الإعدادات.</strong></p> : null}
      {sp.err ? <p className="ao-err" role="alert">{ERR[sp.err] ?? "حصل خطأ، حاول مرة ثانية."}</p> : null}

      {canSettings ? (
        <form action={saveQiSettings} className="ao-card" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          <h2>إعدادات المستلم</h2>
          <label>اسم صاحب البطاقة أو المتجر
            <input name="recipient_name" defaultValue={cfg.recipient_name ?? ""} maxLength={80} style={{ width: "100%", padding: 8 }} />
          </label>
          <label>رقم بطاقة Qi Card المستلمة
            <input name="card_number" dir="ltr" inputMode="numeric" defaultValue={cfg.card_number ?? ""} maxLength={25} style={{ width: "100%", padding: 8 }} />
          </label>
          <label>تعليمات التحويل (سطر لكل خطوة)
            <textarea name="steps" rows={8} defaultValue={steps.join("\n")} style={{ width: "100%", padding: 8 }} />
          </label>
          <label><input type="checkbox" name="enabled" defaultChecked={cfg.enabled === true} /> تفعيل التحويل عبر Qi Card في الـ Checkout</label>
          <button type="submit" style={btn}>حفظ الإعدادات</button>
        </form>
      ) : null}

      <h2>بانتظار المراجعة ({pending.length})</h2>
      {pending.length === 0 ? <p className="ao-muted">ما في تحويلات بانتظار المراجعة.</p> : <ul style={{ listStyle: "none", padding: 0 }}>{pending.map((r) => card(r, true))}</ul>}

      <h2>السجل</h2>
      {done.length === 0 ? <p className="ao-muted">لا يوجد سجل بعد.</p> : <ul style={{ listStyle: "none", padding: 0 }}>{done.map((r) => card(r, false))}</ul>}
    </section>
  );
}
