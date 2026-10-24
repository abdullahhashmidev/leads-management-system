import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  LLM_BASE_URL: z.string().url(),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1),
  NTFY_TOPIC: z.string().min(8).optional(),
});

export function getEnv() {
  const r = schema.safeParse(process.env);
  if (!r.success) {
    const bad = r.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Env galat ya missing: ${bad}. .env.local check karo aur dev server restart karo.`);
  }
  return r.data;
}
