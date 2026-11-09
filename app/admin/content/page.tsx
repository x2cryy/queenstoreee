import { requireAnyPermission } from "../../../lib/admin/access";
import { createClient } from "../../../lib/supabase/server";
import { getCategories } from "../../../lib/shop/queries";
import { publicImageUrl } from "../../../lib/shop/images";
import { normalizeContact, normalizeSections } from "../../../lib/shop/site-content-types";
import { iqDate, type DBanner } from "../../../lib/admin/content-editor";
import { Empty, Panel } from "../_components/ui";
import ContentEditor from "./_components/ContentEditor";

export const dynamic = "force-dynamic";

type BRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  image_path: string | null;
  updated_at: string;
};
type SRow = { key: string; value: unknown; updated_at: string };

export default async function Page() {
  await requireAnyPermission(["content"]);
  const sb = await createClient();
  const [br, sr, cats] = await Promise.all([
    sb
      .from("banners")
      .select("id,title,subtitle,link_url,sort_order,is_active,starts_at,ends_at,image_path,updated_at")
      .order("sort_order")
      .order("created_at", { ascending: false }),
    sb.from("site_settings").select("key,value,updated_at").in("key", ["home_sections", "contact"]),
    getCategories().catch(() => []),
  ]);

  if (br.error || sr.error) {
    return (
      <section>
        <Panel>
          <Empty>تعذّر تحميل بيانات المحتوى. حدّث الصفحة وحاول مرة أخرى.</Empty>
        </Panel>
      </section>
    );
  }

  const rows = (br.data ?? []) as BRow[];
  const srows = (sr.data ?? []) as SRow[];
  const sets = new Map(srows.map((r) => [r.key, r] as const));

  const banners: DBanner[] = rows.map((r) => ({
    key: r.id,
    id: r.id,
    title: r.title ?? "",
    subtitle: r.subtitle ?? "",
    link_url: r.link_url ?? "",
    is_active: r.is_active,
    starts: iqDate(r.starts_at),
    ends: iqDate(r.ends_at),
    image_path: r.image_path,
    src: publicImageUrl("banners", r.image_path),
    updated_at: r.updated_at,
    file: null,
    uploaded: null,
  }));

  const stamps = [...rows.map((r) => r.updated_at), ...srows.map((r) => r.updated_at)].sort();
  const version = `${rows.length}|${srows.length}|${stamps[stamps.length - 1] ?? ""}`;

  return (
    <ContentEditor
      version={version}
      banners={banners}
      sections={normalizeSections(sets.get("home_sections")?.value)}
      contact={normalizeContact(sets.get("contact")?.value)}
      base={{
        settings: Object.fromEntries(srows.map((r) => [r.key, r.updated_at])),
        banners: Object.fromEntries(rows.map((r) => [r.id, r.updated_at])),
      }}
      categories={cats.map((c) => ({ slug: c.slug, name: c.name }))}
    />
  );
}
