import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";
export function db() {
  const e = getEnv();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
}
