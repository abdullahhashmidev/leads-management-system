import "server-only";
import { db } from "@/lib/supabase";

export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return xff || req.headers.get("x-real-ip") || "local";
}

// Fixed-window counter in Postgres (table usage_counters, function hit_counter).
// Shared by every serverless instance. Returns true when the request is allowed.
// Throws on database error; callers treat that as "refuse" (fail closed).
export async function hitCounter(key: string, limit: number, windowMs: number): Promise<boolean> {
  const bucket = Math.floor(Date.now() / windowMs);
  const expiresAt = new Date((bucket + 2) * windowMs).toISOString();
  const { data, error } = await db().rpc("hit_counter", {
    p_key: `${key}:${bucket}`,
    p_limit: limit,
    p_expires: expiresAt,
  });
  if (error) throw error;
  return data === true;
}
