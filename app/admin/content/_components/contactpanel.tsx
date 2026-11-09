"use client";

import {
  CONTACT_KEYS,
  CONTACT_LABELS,
  contactHref,
  type Contact,
  type ContactKey,
  type ContactLink,
} from "../../../../lib/shop/site-content-types";
import { Badge } from "../../_components/ui";

const HINT: Record<ContactKey, string> = {
  whatsapp: "رقم مثل 07701234567",
  instagram: "اسم المستخدم أو رابط https",
  tiktok: "اسم المستخدم أو رابط https",
  phone: "رقم الهاتف",
  email: "name@example.com",
};

export default function ContactPanel({
  contact,
  onChange,
}: {
  contact: Contact;
  onChange: (next: Contact) => void;
}) {
  const patch = (k: ContactKey, p: Partial<ContactLink>) =>
    onChange({ ...contact, [k]: { ...contact[k], ...p } });

  return (
    <details className="ce-group">
      <summary>الفوتر وروابط التواصل</summary>
      <div className="ce-body">
        <p className="ce-hint">لا يظهر في المتجر إلا الرابط المفعّل والصالح.</p>
        {CONTACT_KEYS.map((k) => {
          const l = contact[k];
          const href = l.enabled ? contactHref(k, l) : null;
          return (
            <div className="ce-srow" key={k}>
              <div className="ce-srow-h">
                <strong>{CONTACT_LABELS[k]}</strong>
                {l.enabled ? (
                  href ? <Badge tone="good">صالح</Badge> : <Badge>غير صالح</Badge>
                ) : (
                  <Badge>مخفي</Badge>
                )}
              </div>
              <label className="ce-check">
                <input type="checkbox" checked={l.enabled} onChange={(e) => patch(k, { enabled: e.target.checked })} />
                إظهار في المتجر
              </label>
              <div>
                <label className="ds-label" htmlFor={`cv-${k}`}>القيمة</label>
                <input id={`cv-${k}`} className="ds-input ce-ltr" dir="ltr" maxLength={200} placeholder={HINT[k]} value={l.value} onChange={(e) => patch(k, { value: e.target.value })} />
              </div>
              {k === "whatsapp" ? (
                <div>
                  <label className="ds-label" htmlFor="cm-whatsapp">رسالة افتتاحية (اختياري)</label>
                  <input id="cm-whatsapp" className="ds-input" maxLength={300} value={l.message} onChange={(e) => patch(k, { message: e.target.value })} />
                </div>
              ) : null}
              {l.enabled && !href ? (
                <p className="ce-warn">القيمة غير صالحة أو فارغة: لن يظهر الرابط ولا يمكن النشر.</p>
              ) : null}
              {href ? (
                <div>
                  <a className="ds-btn ce-sm" href={href} target="_blank" rel="noopener noreferrer">تجربة الرابط</a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </details>
  );
}
