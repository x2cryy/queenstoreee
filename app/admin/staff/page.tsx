import { requireOwner } from "../../../lib/auth/session";
import { createClient } from "../../../lib/supabase/server";
import { listStaff } from "../../../lib/auth/staff-actions";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
} from "../../../lib/auth/permissions";
import {
  addStaffAction,
  revokeStaffAction,
  updateStaffAction,
} from "./actions";
import { setStaffStatusAction } from "./status-action";

type Row = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  permissions: Record<string, boolean> | null;
  created_at: string;
};

const OK: Record<string, string> = {
  added: "تمت إضافة المدير بنجاح.",
  updated: "تم حفظ الصلاحيات.",
  revoked: "تم سحب المدير.",
  status: "تم تحديث حالة المدير.",
};
const ERR: Record<string, string> = {
  email: "أدخل بريداً إلكترونياً صحيحاً.",
  failed:
    "تعذّرت العملية. تأكد أن البريد لمستخدم مسجّل في المتجر مسبقاً وأنه ليس المالكة.",
};

function PermGrid({ current }: { current?: Record<string, boolean> | null }) {
  return (
    <div className="qa-perms">
      {PERMISSION_KEYS.map((k) => (
        <label key={k} className="qa-check">
          <input
            type="checkbox"
            name={`perm_${k}`}
            defaultChecked={Boolean(current?.[k])}
          />
          <span>{PERMISSION_LABELS[k]}</span>
        </label>
      ))}
    </div>
  );
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requireOwner("/admin/staff");
  const sp = await searchParams;
  const staff = (await listStaff()) as Row[];
  const supabase = await createClient();
  const { data: st } = await supabase
    .from("profiles")
    .select("id, account_status")
    .in("id", staff.map((s) => s.user_id));
  const statusOf = new Map<string, string>(
    (st ?? []).map(
      (r: { id: string; account_status: string }) =>
        [r.id, r.account_status] as [string, string],
    ),
  );
  const okMsg = sp.ok ? OK[sp.ok] : undefined;
  const errMsg = sp.err ? ERR[sp.err] : undefined;

  return (
    <section>
      <h1 className="qa-h1">المديرون وصلاحياتهم</h1>
      <p className="qa-lead">
        المالكة وحدها تضيف المديرين وتعدّل صلاحياتهم. يجب أن يكون المدير مسجّلاً
        في المتجر بحساب أولاً.
      </p>

      {okMsg && <p className="qa-note qa-ok">{okMsg}</p>}
      {errMsg && <p className="qa-note qa-err">{errMsg}</p>}

      <div className="qa-card">
        <h2 className="qa-h2">إضافة مدير</h2>
        <form action={addStaffAction} className="qa-form">
          <label className="qa-label" htmlFor="email">
            البريد الإلكتروني للمدير
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            dir="ltr"
            autoComplete="off"
            className="qa-input"
          />
          <p className="qa-label">الصلاحيات</p>
          <PermGrid />
          <button type="submit" className="qa-btn">
            إضافة المدير
          </button>
        </form>
      </div>

      <h2 className="qa-h2">الفريق الحالي</h2>
      {staff.length === 0 && <p className="qa-lead">لا يوجد مديرون بعد.</p>}

      {staff.map((s) => {
        const isOwner = s.role === "owner";
        const granted = PERMISSION_KEYS.filter((k) => s.permissions?.[k]);
        return (
          <div key={s.user_id} className="qa-card">
            <div className="qa-row">
              <div>
                <strong>{s.full_name || s.email}</strong>
                <p className="qa-muted" dir="ltr">
                  {s.email}
                </p>
              </div>
              <span className={isOwner ? "qa-badge qa-gold" : "qa-badge"}>
                {isOwner ? "المالكة" : "مدير"}
              </span>
            </div>
            <p className="qa-muted">
              أُضيف في {new Date(s.created_at).toLocaleDateString("en-GB")}
            </p>

            {isOwner ? (
              <p className="qa-muted">للمالكة كل الصلاحيات ولا يمكن تعديلها.</p>
            ) : (
              <>
                <form action={setStaffStatusAction} className="qa-row">
                  <input type="hidden" name="user_id" value={s.user_id} />
                  <input
                    type="hidden"
                    name="status"
                    value={statusOf.get(s.user_id) === "blocked" ? "active" : "blocked"}
                  />
                  <span className={statusOf.get(s.user_id) === "blocked" ? "qa-badge qa-err" : "qa-badge"}>
                    {statusOf.get(s.user_id) === "blocked" ? "موقوف" : "نشط"}
                  </span>
                  <button type="submit" className="qa-btn">
                    {statusOf.get(s.user_id) === "blocked" ? "إعادة المدير" : "إيقاف المدير"}
                  </button>
                </form>
                <div className="qa-chips">
                  {granted.length === 0 && (
                    <span className="qa-muted">بلا صلاحيات حالياً</span>
                  )}
                  {granted.map((k) => (
                    <span key={k} className="qa-chip">
                      {PERMISSION_LABELS[k]}
                    </span>
                  ))}
                </div>

                <details className="qa-details">
                  <summary>تعديل الصلاحيات</summary>
                  <form action={updateStaffAction} className="qa-form">
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <PermGrid current={s.permissions} />
                    <button type="submit" className="qa-btn">
                      حفظ الصلاحيات
                    </button>
                  </form>
                </details>

                <details className="qa-details">
                  <summary>سحب المدير</summary>
                  <form action={revokeStaffAction} className="qa-form">
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <p className="qa-muted">
                      سيفقد هذا الحساب كل صلاحيات الإدارة ويعود زبوناً عادياً.
                    </p>
                    <button type="submit" className="qa-btn qa-danger">
                      تأكيد سحب المدير
                    </button>
                  </form>
                </details>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
