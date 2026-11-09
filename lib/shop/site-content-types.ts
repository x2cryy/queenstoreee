export type HomeSectionId = "categories" | "featured" | "latest";
export type HomeSection = { id: HomeSectionId; visible: boolean; title: string; limit: number };

export const SECTION_LABELS: Record<HomeSectionId, string> = {
  categories: "التصنيفات",
  featured: "منتجات مميزة",
  latest: "وصل حديثاً",
};

export const DEFAULT_SECTIONS: HomeSection[] = [
  { id: "categories", visible: true, title: "تسوق حسب القسم", limit: 12 },
  { id: "featured", visible: true, title: "منتجات مميزة", limit: 8 },
  { id: "latest", visible: true, title: "وصل حديثاً", limit: 8 },
];

export function normalizeSections(raw: unknown): HomeSection[] {
  const out: HomeSection[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const r of raw) {
      if (!r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      const def = DEFAULT_SECTIONS.find((d) => d.id === o.id);
      if (!def || seen.has(def.id)) continue;
      seen.add(def.id);
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const limit = Number(o.limit);
      out.push({
        id: def.id,
        visible: typeof o.visible === "boolean" ? o.visible : def.visible,
        title: title && title.length <= 40 ? title : def.title,
        limit: Number.isInteger(limit) && limit >= 1 && limit <= 24 ? limit : def.limit,
      });
    }
  }
  for (const d of DEFAULT_SECTIONS) if (!seen.has(d.id)) out.push({ ...d });
  return out;
}

export type ContactKey = "whatsapp" | "instagram" | "tiktok" | "phone" | "email";
export type ContactLink = { enabled: boolean; value: string; message: string };
export type Contact = Record<ContactKey, ContactLink>;

export const CONTACT_KEYS: ContactKey[] = ["whatsapp", "instagram", "tiktok", "phone", "email"];
export const CONTACT_LABELS: Record<ContactKey, string> = {
  whatsapp: "واتساب",
  instagram: "إنستغرام",
  tiktok: "تيك توك",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
};

export const emptyContact = (): Contact => ({
  whatsapp: { enabled: false, value: "", message: "" },
  instagram: { enabled: false, value: "", message: "" },
  tiktok: { enabled: false, value: "", message: "" },
  phone: { enabled: false, value: "", message: "" },
  email: { enabled: false, value: "", message: "" },
});

export function normalizeContact(raw: unknown): Contact {
  const c = emptyContact();
  if (!raw || typeof raw !== "object") return c;
  const o = raw as Record<string, unknown>;
  for (const k of CONTACT_KEYS) {
    const r = o[k];
    if (!r || typeof r !== "object") continue;
    const v = r as Record<string, unknown>;
    c[k] = {
      enabled: v.enabled === true,
      value: typeof v.value === "string" ? v.value.trim().slice(0, 200) : "",
      message: typeof v.message === "string" ? v.message.trim().slice(0, 300) : "",
    };
  }
  return c;
}

const latin = (s: string) =>
  s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });

function waNumber(raw: string): string | null {
  let d = latin(raw).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "964" + d.slice(1);
  else if (/^7\d{9}$/.test(d)) d = "964" + d;
  return /^\d{10,15}$/.test(d) ? d : null;
}

function httpsUrl(raw: string, hosts: string[]): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return hosts.includes(h) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** رابط جاهز للعرض أو null إذا كانت القيمة فارغة أو غير صالحة. */
export function contactHref(k: ContactKey, l: ContactLink): string | null {
  const v = l.value.trim();
  if (!v) return null;
  switch (k) {
    case "whatsapp": {
      const n = waNumber(v);
      if (!n) return null;
      const m = l.message.trim();
      return `https://wa.me/${n}${m ? `?text=${encodeURIComponent(m)}` : ""}`;
    }
    case "instagram": {
      if (/^https?:\/\//i.test(v)) return httpsUrl(v, ["instagram.com"]);
      const u = v.replace(/^@/, "");
      return /^[A-Za-z0-9._]{1,30}$/.test(u) ? `https://www.instagram.com/${u}` : null;
    }
    case "tiktok": {
      if (/^https?:\/\//i.test(v)) return httpsUrl(v, ["tiktok.com", "vm.tiktok.com"]);
      const u = v.replace(/^@/, "");
      return /^[A-Za-z0-9._]{1,24}$/.test(u) ? `https://www.tiktok.com/@${u}` : null;
    }
    case "phone": {
      const d = latin(v).replace(/[^\d+]/g, "");
      return /^\+?\d{7,15}$/.test(d) ? `tel:${d}` : null;
    }
    case "email":
      return v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : null;
  }
}
