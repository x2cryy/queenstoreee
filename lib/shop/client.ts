import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "../supabase/env";

// Public, cookie-less client: reads only what RLS lets anonymous visitors see.
export function createPublicClient() {
  const { url, key } = getSupabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
