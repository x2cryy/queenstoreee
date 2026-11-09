import { headers } from "next/headers";

// Best-effort in-memory limiter. It slows down abuse on a single server instance
// but is NOT shared between serverless instances. Supabase Auth applies its own
// rate limits on top of this (tune them in Dashboard > Authentication > Rate Limits).
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export async function rateLimit(
  action: string,
  limit: number,
  windowMs: number,
  extraKey = ""
): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = `${action}:${ip}:${extraKey}`;
  const now = Date.now();

  if (store.size > 5000) {
    for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
  }

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
