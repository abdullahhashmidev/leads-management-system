import "server-only";
import { db } from "@/lib/supabase";

export type Check = { name: string; ok: boolean; detail: string; ms?: number };

const TIMEOUT = 4000;

async function get(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const r = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}

async function run(name: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<Check> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { name, ...r, ms: Date.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return { name, ok: false, detail: msg.slice(0, 120), ms: Date.now() - t0 };
  }
}

export async function runHealth(): Promise<Check[]> {
  return Promise.all([
    run("Database (Supabase)", async () => {
      const res = await Promise.all(
        ["leads", "payments", "lead_notes"].map((t) => db().from(t).select("id", { count: "exact", head: true })),
      );
      const bad = res.find((r) => r.error);
      if (bad?.error) throw new Error(bad.error.message);
      return { ok: true, detail: `${res[0].count} leads, ${res[1].count} payments, ${res[2].count} notes` };
    }),
    run("Owner alerts (ntfy)", async () => {
      const j = (await (await get("https://ntfy.sh/v1/health")).json()) as { healthy?: boolean };
      const topic = !!process.env.NTFY_TOPIC;
      return { ok: !!j.healthy && topic, detail: `service ${j.healthy ? "up" : "down"}, topic ${topic ? "set" : "missing"}` };
    }),
    run("AI model (chatbot)", async () => {
      const u = (process.env.LLM_BASE_URL ?? "").replace(/\/$/, "");
      await get(`${u}/models`, { Authorization: `Bearer ${process.env.LLM_API_KEY ?? ""}` });
      return { ok: true, detail: `${process.env.LLM_MODEL ?? "model"} reachable` };
    }),
    run("Configuration", async () => {
      const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "NTFY_TOPIC", "ADMIN_PASSWORD", "SESSION_SECRET"];
      const missing = need.filter((k) => !process.env[k]);
      return { ok: !missing.length, detail: missing.length ? `missing: ${missing.join(", ")}` : `all ${need.length} settings present` };
    }),
  ]);
}
