import { getSupabaseEnv } from "../supabase/env";

export function publicImageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const { url } = getSupabaseEnv();
  if (/^https?:\/\//i.test(path)) return path.startsWith(url) ? path : null;
  return `${url}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// Only same-site paths and http(s) links are allowed as banner targets.
export function safeHref(h: string | null | undefined) {
  if (!h) return null;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (/^https?:\/\//i.test(h)) return h;
  return null;
}
