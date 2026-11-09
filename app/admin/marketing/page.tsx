import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { formatPrice } from "../../../lib/shop/format";
import { createCouponAction, toggleCouponAction } from "./actions";

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
};

const OK: Record<string, string> = {
  created: "تم إنشاء الكوبون.",
  toggled: "تم تحديث حالة الكوبون.",
};
const ERR: Record<string, string> = {
  code: "الكود لازم يكون 3 إلى 40 حرفاً: حروف إنجليزية وأرقام و _ و - فقط.",
  value: "قيمة الخصم غير صالحة. النسبة من 1 إلى 100، والمبلغ رقم صحيح موجب.",
  numbers: "الحد الأدنى أو السقف أو عدد الاستخدامات غير صالح.",
  dates: "التواريخ غير صالحة، ولازم تاريخ النهاية بعد البداية.",
  duplicate: "هذا الكود موجود مسبقاً.",
  failed: "تعذر الحفظ. حاول مرة أخرى.",
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB") : "—";

function statusOf(c: Coupon, now: number): { label: string; bad: boolean } {
  if (!c.is_active) return { label: "موقوف", bad: true };
  if (c.ends_at && now > new Date(c.ends_at).getTime()) return { label: "منتهي", bad: true };
  if (c.starts_at && now < new Date(c.starts_at).getTime()) return { label: "لم يبدأ", bad: false };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { label: "مستنفد", bad: true };
  return { label: "فعّال", bad: false };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requireAnyPermission(["marketing"]);
  const sp = await searchParams;
  const okMsg = sp.ok ? OK[sp.ok] : undefined;
  const errMsg = sp.err ? ERR[sp.err] : undefined;

  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, ends_at, usage_limit, used_count, is_active"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const coupons = (data ?? []) as Coupon[];
  const now = Date.now();
  const { data: usageRows } = await supabase.from("orders").select("id, order_number, customer_name, coupon_code, discount_total, created_at").not("coupon_code", "is", null).order("created_at", { ascending: false }).limit(100);

  return (
    <section>
      <h1 className="qa-h1">العروض والتسويق</h1>
      <p className="qa-lead">
        أنشئ كوبونات الخصم. الزبون يكتب الكود في صفحة إتمام الطلب. الكوبون لا يُحذف، يُوقف فقط.
      </p>

      {okMsg && <p className="qa-note qa-ok">{okMsg}</p>}
      {errMsg && <p className="qa-note qa-err">{errMsg}</p>}

      <div className="qa-card">
        <h2 className="qa-h2">إضافة كوبون</h2>
        <form action={createCouponAction} className="qa-form">
          <label className="qa-label" htmlFor="code">الكود (حروف إنجليزية وأرقام)</label>
          <input id="code" name="code" required dir="ltr" maxLength={40} autoComplete="off" className="qa-input" />

          <label className="qa-label" htmlFor="discount_type">نوع الخصم</label>
          <select id="discount_type" name="discount_type" className="qa-input" defaultValue="percent">
            <option value="percent">نسبة مئوية %</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>

          <label className="qa-label" htmlFor="discount_value">قيمة الخصم (رقم)</label>
          <input id="discount_value" name="discount_value" required type="number" inputMode="numeric" min={1} dir="ltr" className="qa-input" />

          <label className="qa-label" htmlFor="min_order_amount">الحد الأدنى للطلب (اختياري)</label>
          <input id="min_order_amount" name="min_order_amount" type="number" inputMode="numeric" min={0} dir="ltr" className="qa-input" />

          <label className="qa-label" htmlFor="max_discount_amount">سقف الخصم، للنسبة فقط (اختياري)</label>
          <input id="max_discount_amount" name="max_discount_amount" type="number" inputMode="numeric" min={1} dir="ltr" className="qa-input" />

          <label className="qa-label" htmlFor="usage_limit">عدد مرات الاستخدام (فارغ = بلا حد)</label>
          <input id="usage_limit" name="usage_limit" type="number" inputMode="numeric" min={1} dir="ltr" className="qa-input" />

          <label className="qa-label" htmlFor="starts_at">يبدأ من (اختياري)</label>
          <input id="starts_at" name="starts_at" type="date" dir="ltr" className="qa-input" />

          <label className="qa-label" htmlFor="ends_at">ينتهي في (اختياري)</label>
          <input id="ends_at" name="ends_at" type="date" dir="ltr" className="qa-input" />

          <button type="submit" className="qa-btn">إضافة الكوبون</button>
        </form>
      </div>

      <div className="qa-row" style={{ flexWrap: "wrap", gap: 10 }}>
        {[
          { l: "فعالة", v: coupons.filter((c) => statusOf(c, now).label === "فعال").length },
          { l: "مجدولة", v: coupons.filter((c) => statusOf(c, now).label === "لم يبدأ").length },
          { l: "منتهية", v: coupons.filter((c) => statusOf(c, now).label === "منتهي").length },
          { l: "مرات الاستخدام", v: coupons.reduce((a, c) => a + (c.used_count || 0), 0) },
        ].map((k) => (
          <div key={k.l} className="qa-card" style={{ flex: "1 1 130px", minWidth: 0 }}>
            <p className="qa-muted">{k.l}</p>
            <strong>{k.v}</strong>
          </div>
        ))}
      </div>

      <h2 className="qa-h2">الكوبونات</h2>
      {coupons.length === 0 && <p className="qa-lead">لا توجد كوبونات بعد.</p>}

      {coupons.map((c) => {
        const st = statusOf(c, now);
        return (
          <div key={c.id} className="qa-card">
            <div className="qa-row">
              <div>
                <strong dir="ltr">{c.code}</strong>
                <p className="qa-muted">
                  {c.discount_type === "percent"
                    ? `خصم ${Number(c.discount_value)}%`
                    : `خصم ${formatPrice(Number(c.discount_value))}`}
                  {c.max_discount_amount !== null ? ` (سقف ${formatPrice(Number(c.max_discount_amount))})` : ""}
                </p>
              </div>
              <span className={st.bad ? "qa-badge qa-err" : "qa-badge qa-gold"}>{st.label}</span>
            </div>
            <p className="qa-muted">
              الحد الأدنى: {formatPrice(Number(c.min_order_amount))} · الاستخدام: {c.used_count}
              {c.usage_limit !== null ? ` / ${c.usage_limit}` : " (بلا حد)"}
            </p>
            <p className="qa-muted">
              من {fmtDate(c.starts_at)} إلى {fmtDate(c.ends_at)}
            </p>
              {(() => {
                const rows = (usageRows ?? []).filter((r) => String(r.coupon_code).toUpperCase() === c.code.toUpperCase());
                if (rows.length === 0) return null;
                return (
                  <details>
                    <summary className="qa-muted">سجل الاستخدام ({rows.length})</summary>
                    {rows.slice(0, 10).map((r) => (
                      <p key={r.id} className="qa-muted">
                        {r.customer_name} · #{r.order_number} · {fmtDate(r.created_at)} · خصم {formatPrice(Number(r.discount_total))}
                      </p>
                    ))}
                  </details>
                );
              })()}
            <form action={toggleCouponAction} className="qa-row">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={c.is_active ? "false" : "true"} />
              <button type="submit" className="qa-btn">
                {c.is_active ? "إيقاف الكوبون" : "تفعيل الكوبون"}
              </button>
            </form>
          </div>
        );
      })}
    </section>
  );
}
