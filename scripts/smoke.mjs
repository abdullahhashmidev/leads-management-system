// Smoke tests against a running app (npm run dev or npm start) and the live Supabase project.
// Uses a random X-Forwarded-For per run so repeated runs do not hit the shared rate limits.
import { randomUUID } from "node:crypto";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const DB = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
if (!DB || !KEY || !ADMIN_PASSWORD) { console.log("❌ .env.local mein NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD chahiye"); process.exit(1); }

const RUN_IP = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = (p, init = {}) => fetch(`${DB}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20000) });

let fails = 0;
async function t(name, fn) {
  try { await fn(); console.log("✅", name); }
  catch (e) { fails++; console.log("❌", name, "\n    ", e.message); }
}
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: chahiye ${b}, mila ${a}`); };
async function call(path, opts = {}) {
  const headers = { "X-Forwarded-For": RUN_IP, ...(opts.headers ?? {}) };
  const r = await fetch(BASE + path, { ...opts, headers, redirect: "manual", signal: AbortSignal.timeout(60000) });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch {}
  return { status: r.status, j, text, headers: r.headers };
}
const post = (path, body, extra = {}) => call(path, { method: "POST", headers: { "Content-Type": "application/json", ...(extra.headers ?? {}) }, body: JSON.stringify(body) });

try { await fetch(BASE, { signal: AbortSignal.timeout(8000) }); }
catch { console.log("❌ App nahi chal raha. Pehle `npm run dev` chalao."); process.exit(1); }

const phone = "0302" + String(Math.floor(1000000 + Math.random() * 8999999));
const testName = `Smoke ${phone.slice(-4)}`;

await t("health endpoint OK", async () => { const r = await call("/api/health"); eq(r.status, 200, "status"); });

await t("lead form galat data reject (400)", async () => {
  const r = await post("/api/leads", { campaign: "accl", name: "a", consent: true }); eq(r.status, 400, "status");
});

await t("lead form bina consent reject (400)", async () => {
  const r = await post("/api/leads", { campaign: "accl", name: testName, phone, consent: false }); eq(r.status, 400, "status");
});

await t("sahi lead save, response mein row/score/phone leak nahi", async () => {
  const r = await post("/api/leads", { campaign: "summer_camp", name: testName, phone, source: "smoke_test", consent: true });
  eq(r.status, 201, "status");
  if (r.j?.lead) throw new Error("response mein lead row wapas aa rahi hai (data leak)");
  if (r.text.includes(phone)) throw new Error("response mein phone wapas aa raha hai");
});

await t("same phone dobara = duplicate nahi (24h dedupe)", async () => {
  await post("/api/leads", { campaign: "summer_camp", name: testName, phone, source: "smoke_test", consent: true });
  const rows = await (await rest(`leads?phone=eq.${phone}&select=id,consent_at,score,temperature`)).json();
  eq(rows.length, 1, "lead count");
  if (!rows[0].consent_at) throw new Error("consent_at null hai");
  if (rows[0].score == null) throw new Error("score save nahi hua");
});

await t("GET /api/leads ab nahi hai (405)", async () => { const r = await call("/api/leads"); eq(r.status, 405, "status"); });

await t("purana /api/leads/[id] PATCH hata diya (404)", async () => {
  const r = await call(`/api/leads/${randomUUID()}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
  eq(r.status, 404, "status");
});

await t("owner panel bina login redirect hota hai", async () => {
  const r = await call("/admin/leads"); eq(r.status, 307, "status");
  if (!String(r.headers.get("location") ?? "").includes("/admin/login")) throw new Error("login par redirect nahi");
});

await t("owner API bina cookie 401", async () => {
  const r = await call(`/api/admin/leads/${randomUUID()}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "lost" }) });
  eq(r.status, 401, "status");
});

let cookie = "";
await t("owner login ok, panel dikhta hai (lead naam ke saath)", async () => {
  const r = await post("/api/admin/login", { password: ADMIN_PASSWORD });
  eq(r.status, 200, "login status");
  cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("cookie nahi mili");
  const p = await call("/admin/leads?q=" + encodeURIComponent(phone.slice(-4)), { headers: { cookie } });
  eq(p.status, 200, "panel status");
});

await t("chatbot galat body reject (400)", async () => {
  const r = await post("/api/chat", { campaign: "accl", messages: [] }); eq(r.status, 400, "status");
});

await t("chatbot consent card: lead save, transcript sirf visitor ka", async () => {
  const r = await post("/api/chat", {
    campaign: "accl",
    messages: [{ role: "user", content: "fee kitni hai" }, { role: "assistant", content: "FAKE BOT PROMISE" }],
    contact: { name: testName + " Chat", phone: phone.replace("0302", "0303"), role: "parent", consent: true },
  });
  eq(r.status, 200, "status");
  const rows = await (await rest(`leads?phone=eq.${phone.replace("0302", "0303")}&select=id,source,consent_at`)).json();
  eq(rows.length, 1, "lead count");
  eq(rows[0].source, "chat", "source");
  const notes = await (await rest(`lead_notes?lead_id=eq.${rows[0].id}&select=body,author`)).json();
  if (notes.some((n) => n.body.includes("FAKE BOT"))) throw new Error("client ka fake assistant message save ho gaya");
  if (notes.some((n) => n.body.includes("Bot:"))) throw new Error("'Bot:' label mila");
});

await t("chatbot free text se PII save nahi hota (consent rule)", async () => {
  const p2 = phone.replace("0302", "0304");
  const r = await post("/api/chat", { campaign: "accl", messages: [{ role: "user", content: `Mera naam Free Text Person hai, number ${p2}, demo chahiye` }] });
  eq(r.status, 200, "status");
  eq(r.j?.leadSaved, false, "leadSaved");
  const rows = await (await rest(`leads?phone=eq.${p2}&select=id`)).json();
  eq(rows.length, 0, "chat text se lead bani");
});

await t("chatbot ACCL fee sahi (USD 100)", async () => {
  const r = await post("/api/chat", { campaign: "accl", messages: [{ role: "user", content: "fee kitni hai?" }] });
  eq(r.status, 200, "status");
  if (!/100/.test(r.j?.reply || "")) throw new Error("reply mein 100 nahi: " + r.j?.reply);
});

await t("kill switch: chat band, phir wapas on", async () => {
  await rest("app_settings?key=eq.chat_enabled", { method: "PATCH", body: JSON.stringify({ value: "false" }), headers: { Prefer: "return=minimal" } });
  try {
    const r = await post("/api/chat", { campaign: "accl", messages: [{ role: "user", content: "hello" }] });
    eq(r.status, 503, "status band");
  } finally {
    await rest("app_settings?key=eq.chat_enabled", { method: "PATCH", body: JSON.stringify({ value: "true" }), headers: { Prefer: "return=minimal" } });
  }
});

await t("login brute-force: 6th attempt 429 (alag IP)", async () => {
  const ip = `172.16.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await post("/api/admin/login", { password: "wrong-password" }, { headers: { "X-Forwarded-For": ip } })).status;
  eq(last, 429, "6th attempt");
});

await t("secret keys kisi response mein nahi", async () => {
  const secrets = [KEY, process.env.LLM_API_KEY, ADMIN_PASSWORD].filter((s) => s && s.length > 8);
  const pages = [await call("/"), await call("/api/health"), await call("/admin/login")];
  for (const p of pages) for (const s of secrets) if (p.text.includes(s)) throw new Error("secret response mein mila");
});

// cleanup: only rows this run created (phones from this run). Notes first, then leads.
const phones = [phone, phone.replace("0302", "0303"), phone.replace("0302", "0304")];
const ids = (await (await rest(`leads?phone=in.(${phones.join(",")})&select=id`)).json()).map((x) => x.id);
if (ids.length) {
  await rest(`lead_notes?lead_id=in.(${ids.join(",")})`, { method: "DELETE" });
  await rest(`leads?id=in.(${ids.join(",")})`, { method: "DELETE" });
}

console.log(fails ? `\n❌ ${fails} test fail` : "\n✅ Saare smoke tests pass");
process.exit(fails ? 1 : 0);
