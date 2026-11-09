import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Browser client that shares the cookie session with the server.
// Use this (not lib/supabase/client.ts) for any browser call that needs the signed-in user.
export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}
