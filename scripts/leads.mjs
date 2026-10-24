// Prints the 50 newest leads straight from Supabase (service role, server-side only).
const DB = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DB || !KEY) { console.error("env missing (.env.local)"); process.exit(1); }
const r = await fetch(`${DB}/rest/v1/leads?select=name,phone,campaign,role,course,status,score,temperature,source,created_at&order=created_at.desc&limit=50`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  signal: AbortSignal.timeout(20000),
});
if (!r.ok) { console.error("lookup failed", r.status, (await r.text()).slice(0, 200)); process.exit(1); }
const rows = await r.json();
console.table(rows);
console.log(`${rows.length} leads (latest 50)`);
