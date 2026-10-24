import "server-only";
import { db } from "@/lib/supabase";
import { after } from "next/server";
import { log, logError } from "@/lib/log";
import { COLD_BELOW, HOT_AT, breakdown } from "@/lib/admin/scoring";

export type NewLead = {
  campaign: "summer_camp" | "accl";
  name: string;
  phone: string;
  country?: string;
  role?: string;
  course?: string;
  source?: string;
  chat_summary?: string;
  intent?: "high" | "medium" | "low";
  consent_at: string | null;
};

export async function createLead(input: NewLead) {
  const { total } = breakdown({ role: input.role ?? null, campaign: input.campaign, intent: input.intent ?? null });
  const temperature = total >= HOT_AT ? "hot" : total < COLD_BELOW ? "cold" : "warm";
  const row = {
    campaign: input.campaign, name: input.name, phone: input.phone, country: input.country, role: input.role,
    course: input.course, source: input.source, chat_summary: input.chat_summary, intent: input.intent,
    consent_at: input.consent_at, score: total, temperature,
  };
  const { data, error } = await db().from("leads").insert(row).select().single();
  if (error) throw error;
  log("leads", "created", { id: data.id, source: data.source, temperature });
  if (temperature === "hot") after(() => notifyHot(data.campaign, total, data.source));
  return data;
}

// Owner alert without personal data. Failure never affects the saved lead.
async function notifyHot(campaign: string, score: number, source: string | null) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  try {
    const r = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { Title: `HOT lead (score ${score})`, Priority: "high", Tags: "fire" },
      body: `Campaign: ${campaign} | Source: ${source ?? "-"}. Open the owner console to reply.`,
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) logError("ntfy", new Error(`HTTP ${r.status}`));
  } catch (e) {
    logError("ntfy", e);
  }
}

export async function hasRecentLead(phone: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db().from("leads").select("id").eq("phone", phone).gte("created_at", since).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
