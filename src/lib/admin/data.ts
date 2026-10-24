import "server-only";
import { db } from "@/lib/supabase";

export const STATUSES = ["new", "qualified", "contacted", "demo_booked", "enrolled", "lost"] as const;
export const OPEN_STATUSES: readonly string[] = ["new", "qualified", "contacted"];
export const TEMPS = ["hot", "warm", "cold"] as const;
export const CAMPAIGNS = ["accl", "summer_camp"] as const;
export const CURRENCIES = ["USD", "PKR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Lead = {
  id: string; created_at: string; campaign: string; name: string; phone: string;
  country: string | null; role: string | null; course: string | null; source: string | null;
  status: string; score: number | null; temperature: string | null; intent: string | null;
  chat_summary: string | null; follow_up_at: string | null; is_dummy: boolean;
};
export type Payment = {
  id: string; lead_id: string | null; student_name: string; campaign: string; amount: number;
  amount_paid: number; currency: Currency; method: string; status: string; plan: string | null;
  due_date: string | null; paid_at: string | null; receipt_no: string | null; note: string | null;
  is_dummy: boolean; created_at: string;
};
export type Note = { id: string; lead_id: string; body: string; author: string; created_at: string };

export type LeadFilters = { q?: string; campaign?: string; temp?: string; status?: string; real?: boolean };

export async function getLeads(f: LeadFilters): Promise<Lead[]> {
  let query = db().from("leads").select("*");
  if (f.campaign) query = query.eq("campaign", f.campaign);
  if (f.temp) query = query.eq("temperature", f.temp);
  if (f.status) query = query.eq("status", f.status);
  if (f.real) query = query.eq("is_dummy", false);
  if (f.q) {
    const t = f.q.replace(/[^\p{L}\p{N}\s+.@-]/gu, "").trim().slice(0, 40);
    if (t) query = query.or(`name.ilike.%${t}%,phone.ilike.%${t}%`);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function getLead(id: string): Promise<{ lead: Lead; notes: Note[]; payments: Payment[] } | null> {
  const [l, n, p] = await Promise.all([
    db().from("leads").select("*").eq("id", id).maybeSingle(),
    db().from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    db().from("payments").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (l.error) throw l.error;
  if (n.error) throw n.error;
  if (p.error) throw p.error;
  if (!l.data) return null;
  return { lead: l.data as Lead, notes: (n.data ?? []) as Note[], payments: (p.data ?? []) as Payment[] };
}

export async function getPayments(limit = 200): Promise<Payment[]> {
  const { data, error } = await db().from("payments").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export type Summary = {
  total: number;
  hotWaiting: number;
  byStatus: Record<string, number>;
  followUps: Lead[];
  days: { label: string; count: number }[];
  funnel: Record<string, Record<string, number>>;
  totals: Record<Currency, { collected: number; outstanding: number; overdue: number }>;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const isUnpaid = (p: Payment) => p.status === "pending" || p.status === "partial";

// Demo scale: aggregates in memory. Move to SQL views if the table grows past a few thousand rows.
// Pages through the whole table. Fails loudly past the cap instead of showing wrong money totals.
async function fetchAll<T>(table: "leads" | "payments", cap = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from(table).select("*").order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
    if (out.length >= cap) throw new Error(`${table} has more than ${cap} rows; move totals to SQL views`);
  }
  return out;
}

export async function getSummary(): Promise<Summary> {
  const [leads, pays] = await Promise.all([fetchAll<Lead>("leads"), fetchAll<Payment>("payments")]);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  const byStatus: Record<string, number> = {};
  const funnel: Record<string, Record<string, number>> = {};
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    funnel[l.campaign] ??= {};
    funnel[l.campaign][l.status] = (funnel[l.campaign][l.status] ?? 0) + 1;
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 864e5).toISOString().slice(0, 10);
    return { label: d.slice(5), count: leads.filter((l) => l.created_at.slice(0, 10) === d).length };
  });

  const totals = {} as Summary["totals"];
  for (const c of CURRENCIES) {
    const mine = pays.filter((p) => p.currency === c);
    const owed = (p: Payment) => Number(p.amount) - Number(p.amount_paid);
    totals[c] = {
      collected: sum(mine.filter((p) => p.status === "paid" || p.status === "partial").map((p) => Number(p.amount_paid))),
      outstanding: sum(mine.filter(isUnpaid).map(owed)),
      overdue: sum(mine.filter((p) => isUnpaid(p) && p.due_date !== null && p.due_date < today).map(owed)),
    };
  }

  const followUps = leads
    .filter((l) => OPEN_STATUSES.includes(l.status) && l.follow_up_at && Date.parse(l.follow_up_at) <= now)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8);

  return {
    total: leads.length,
    hotWaiting: leads.filter((l) => l.temperature === "hot" && OPEN_STATUSES.includes(l.status)).length,
    byStatus, followUps, days, funnel, totals,
  };
}
