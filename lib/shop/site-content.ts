import { cache } from "react";
import { createPublicClient } from "./client";
import {
  DEFAULT_SECTIONS,
  emptyContact,
  normalizeContact,
  normalizeSections,
  type Contact,
  type HomeSection,
} from "./site-content-types";

export type SiteContent = { sections: HomeSection[]; contact: Contact };

// عند أي فشل نرجع الإعدادات الافتراضية (نفس مظهر المتجر الحالي) ولا نكسر الصفحة.
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    const sb = createPublicClient();
    const { data, error } = await sb.from("site_settings").select("key, value").in("key", ["home_sections", "contact"]);
    if (error) throw error;
    const m = new Map<string, unknown>();
    for (const r of data ?? []) m.set(String(r.key), r.value);
    return { sections: normalizeSections(m.get("home_sections")), contact: normalizeContact(m.get("contact")) };
  } catch {
    return { sections: DEFAULT_SECTIONS.map((s) => ({ ...s })), contact: emptyContact() };
  }
});
