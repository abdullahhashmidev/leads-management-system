const BASE = process.env.APP_URL ?? "http://127.0.0.1:3000";
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p, init = {}) => fetch(`${U}/rest/v1/${p}`, { ...init, headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lg = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
const cookie = (lg.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
console.log("owner login:", lg.status, lg.ok ? "" : (await lg.clone().text()).slice(0, 120));
let failed = 0;
for (const campaign of ["accl", "summer_camp"]) {
  const name = `Form Test ${campaign} ${Date.now().toString().slice(-6)}`;
  const phone = `0300${Math.floor(Math.random() * 9e6) + 1e6}`;
  const variants = [
    { campaign, name, phone, country: "Pakistan", role: "parent" },
    { campaign, name, phone, country: "Pakistan", role: "parent", course: "AI Basics", source: "form" },
  ];
  let res;
  for (const v of variants) {
    res = await fetch(`${BASE}/api/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    if (res.status !== 400) break;
  }
  const txt = (await res.text()).slice(0, 200);
  console.log(`[${campaign}] POST /api/leads -> ${res.status} ${txt}`);
  if (!res.ok) { failed++; continue; }
  let row = null;
  for (let i = 0; i < 15; i++) {
    const q = await rest(`leads?name=eq.${encodeURIComponent(name)}&select=id,campaign,status,score,temperature,source,is_dummy`);
    row = (await q.json())[0];
    if (row && row.score != null) break;
    await sleep(3000);
  }
  const saved = !!row, scored = row?.score != null;
  let visible = false;
  if (saved && cookie) visible = (await (await fetch(`${BASE}/admin/leads`, { headers: { cookie } })).text()).includes(name);
  console.log(`[${campaign}] saved=${saved} scored=${scored} (${row?.score} ${row?.temperature}) source=${row?.source} is_dummy=${row?.is_dummy} visible_in_owner_panel=${visible}`);
  if (!(saved && scored && visible)) failed++;
  if (row) { await rest(`lead_notes?lead_id=eq.${row.id}`, { method: "DELETE" }); await rest(`leads?id=eq.${row.id}`, { method: "DELETE" }); }
}
console.log(failed ? "FORM PIPELINE FAIL" : "FORM PIPELINE OK");
process.exit(failed ? 1 : 0);
