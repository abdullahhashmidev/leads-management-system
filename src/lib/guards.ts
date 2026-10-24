import "server-only";
import { db } from "@/lib/supabase";
import { hitCounter } from "@/lib/ratelimit";

// Kill switch. Owner pauses the chatbot with one SQL update (no redeploy):
//   update app_settings set value = 'false' where key = 'chat_enabled';
// CHAT_ENABLED=false in env also pauses it. Any read error counts as paused (fail closed).
export async function chatEnabled(): Promise<boolean> {
  if (process.env.CHAT_ENABLED === "false") return false;
  try {
    const { data, error } = await db().from("app_settings").select("value").eq("key", "chat_enabled").maybeSingle();
    if (error) throw error;
    return (data?.value ?? "true") === "true";
  } catch {
    return false;
  }
}

// Spend guard for every Groq call, global across all visitors and IPs.
// Per-minute window keeps us under the org request-per-minute limit; daily window keeps tokens under the org token-per-day limit.
export async function llmBudgetOk(): Promise<boolean> {
  const perMin = Number(process.env.CHAT_LLM_PER_MIN ?? 5);
  const perDay = Number(process.env.CHAT_DAILY_LLM_LIMIT ?? 100);
  try {
    const minuteOk = await hitCounter("llm:min", perMin, 60_000);
    if (!minuteOk) return false;
    return await hitCounter("llm:day", perDay, 86_400_000);
  } catch {
    return false;
  }
}
