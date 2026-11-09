import {
  CONTACT_KEYS,
  CONTACT_LABELS,
  contactHref,
  type Contact,
  type HomeSection,
} from "../shop/site-content-types";

export type DBanner = {
  key: string;
  id: string; // "" for a banner not saved yet
  title: string;
  subtitle: string;
  link_url: string;
  is_active: boolean;
  starts: string; // YYYY-MM-DD (Iraq) or ""
  ends: string;
  image_path: string | null;
  src: string | null; // public URL, or a blob URL for a picked image
  updated_at: string | null;
  file: File | null; // new image waiting for upload
  uploaded: string | null; // uploaded path waiting for publish
};

export type Draft = {
  banners: DBanner[];
  sections: HomeSection[];
  contact: Contact;
  deleted: string[];
};

export type Base = { settings: Record<string, string>; banners: Record<string, string> };

export const MAX_BANNERS = 20;

// Iraq has no daylight saving: fixed UTC+3.
export const iqDate = (iso: string | null): string =>
  iso ? new Date(new Date(iso).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10) : "";

export function linkProblem(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (s.length > 500) return "الرابط طويل جدًا.";
  if (/^\/(?![/\\])/.test(s)) return null;
  if (/^https:\/\/\S+$/i.test(s)) return null;
  return "الرابط يجب أن يبدأ بـ / أو https://";
}

export function validate(d: Draft): string | null {
  if (d.banners.length > MAX_BANNERS) return `الحد الأقصى ${MAX_BANNERS} بانر.`;
  for (let i = 0; i < d.banners.length; i++) {
    const b = d.banners[i];
    const n = i + 1;
    if (!b.file && !b.image_path) return `البانر ${n}: الصورة مطلوبة.`;
    if (b.title.length > 120) return `البانر ${n}: العنوان طويل جدًا.`;
    if (b.subtitle.length > 300) return `البانر ${n}: النص المختصر طويل جدًا.`;
    const lp = linkProblem(b.link_url);
    if (lp) return `البانر ${n}: ${lp}`;
    if (b.starts && b.ends && b.starts > b.ends) return `البانر ${n}: تاريخ البداية بعد تاريخ النهاية.`;
  }
  for (const k of CONTACT_KEYS) {
    const l = d.contact[k];
    if (l.enabled && contactHref(k, l) === null) {
      return `${CONTACT_LABELS[k]}: القيمة غير صالحة أو فارغة.`;
    }
  }
  return null;
}

export function draftSig(d: Draft): string {
  return JSON.stringify([
    d.banners.map((b) => [
      b.id, b.title, b.subtitle, b.link_url, b.is_active, b.starts, b.ends, b.image_path, b.file ? 1 : 0,
    ]),
    d.sections,
    d.contact,
    d.deleted,
  ]);
}

export function buildPayload(d: Draft, base: Base) {
  return {
    settings: { home_sections: d.sections, contact: d.contact },
    banners: d.banners.map((b, i) => ({
      id: b.id || undefined,
      title: b.title.trim(),
      subtitle: b.subtitle.trim(),
      link_url: b.link_url.trim(),
      is_active: b.is_active,
      sort_order: i,
      starts_at: b.starts ? `${b.starts}T00:00:00+03:00` : null,
      ends_at: b.ends ? `${b.ends}T23:59:59.999+03:00` : null,
      image_path: b.uploaded ?? (b.file ? undefined : b.image_path),
    })),
    delete_banner_ids: d.deleted,
    base: { settings: base.settings, banners: base.banners },
  };
}
