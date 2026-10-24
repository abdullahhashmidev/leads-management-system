const BASE = process.env.APP_URL ?? "http://127.0.0.1:3000";
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p, init = {}) => fetch(`${U}/rest/v1/${p}`, { ...init, headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (body) => fetch(`${BASE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// 1) AI path: suggestions + handoff fields
const r2 = await post({ campaign: "accl", messages: [{ role: "user", content: "Which courses do you offer?" }] });
const j2 = await r2.json().catch(() => null);
console.log("ai reply:", r2.status, String(j2?.reply ?? "").slice(0, 140));
console.log("suggestions:", JSON.stringify(j2?.suggestions), "handoff:", j2?.handoff);
const aiOk = r2.ok && Array.isArray(j2?.suggestions);

// 2) lead card path: lead + transcript note + n8n score
const name = `Card Test ${Date.now().toString().slice(-6)}`;
const phone = `0301${Math.floor(Math.random() * 9e6) + 1e6}`;
const r = await post({
  campaign: "accl",
  messages: [{ role: "user", content: "What is the fee?" }, { role: "assistant", content: "Our team will confirm the fee with you." }],
  contact: { name, phone, role: "parent", time: "evening" },
});
const j = await r.json().catch(() => null);
console.log("card submit:", r.status, j?.reply ?? JSON.stringify(j).slice(0, 160));
const sel = `leads?name=eq.${encodeURIComponent(name)}&select=id,source,intent,chat_summary,score,temperature`;
let row = (await (await rest(sel)).json())[0];
let notes = [];
if (row) {
  for (let i = 0; i < 10 && row.score == null; i++) { await sleep(3000); row = (await (await rest(sel)).json())[0] ?? row; }
  notes = await (await rest(`lead_notes?lead_id=eq.${row.id}&select=author,body`)).json();
}
console.log("lead:", row ? `saved source=${row.source} intent=${row.intent} score=${row.score} ${row.temperature}` : "NOT SAVED");
console.log("summary:", row?.chat_summary);
console.log("transcript note:", Array.isArray(notes) && notes.length ? `yes (author=${notes[0].author})` : "NO");
if (row) { await rest(`lead_notes?lead_id=eq.${row.id}`, { method: "DELETE" }); await rest(`leads?id=eq.${row.id}`, { method: "DELETE" }); }
const ok = aiOk && !!row && row.source === "chat" && row.score != null && Array.isArray(notes) && notes.length > 0;
console.log(ok ? "CHAT CARD OK" : "CHAT CARD FAIL");
process.exit(ok ? 0 : 1);
