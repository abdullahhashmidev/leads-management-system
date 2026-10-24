/* eslint-disable @typescript-eslint/no-unused-expressions */
// Health check for the leads system. Modes: default (full), --static (no network), --quick (no DB writes).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const A = process.argv;
const STATIC = A.includes("--static");
let fails = 0, warns = 0;
const ok = (m) => console.log("✅", m);
const bad = (m) => { fails++; console.log("❌", m); };
const warn = (m) => { warns++; console.log("⚠️ ", m); };
const E = process.env;

function structure() {
  const need = [
    "src/lib/env.ts", "src/lib/leads.ts", "src/lib/supabase.ts", "src/lib/ratelimit.ts", "src/lib/guards.ts",
    "src/app/api/leads/route.ts", "src/app/api/chat/route.ts", "src/app/api/admin/login/route.ts",
    "supabase/schema.sql", "supabase/migrations/20261025_guards.sql", "scripts/smoke.mjs", ".gitignore", "package.json",
  ];
  const miss = need.filter((p) => !existsSync(p));
  miss.length ? bad("missing files: " + miss.join(", ")) : ok("file structure intact");
  const stale = ["n8n", "scripts/n8n-sync.mjs", "src/app/api/leads/[id]/route.ts", "src/lib/chatlead.ts"].filter((p) => existsSync(p));
  stale.length ? bad("purani files abhi bhi hain (delete karo): " + stale.join(", ")) : ok("purani n8n/ADMIN_TOKEN files nahi hain");
}

function env() {
  const req = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "NTFY_TOPIC", "ADMIN_PASSWORD", "SESSION_SECRET"];
  const missing = req.filter((k) => !E[k]);
  if (missing.length) return bad("env missing: " + missing.join(", "));
  const ph = req.filter((k) => /yahan|your_|changeme|xxxx|<set>/i.test(E[k]));
  ph.length ? bad("env placeholder values: " + ph.join(", ")) : ok("env keys set");
  if ((E.SESSION_SECRET ?? "").length < 32) bad("SESSION_SECRET 32 chars se chhota hai");
  if (E.CHAT_ENABLED === "false") warn("CHAT_ENABLED=false: chatbot band hai");
  const g = spawnSync("git", ["check-ignore", ".env.local"], { encoding: "utf8" });
  g.status === 0 ? ok(".env.local git-ignored") : warn(".env.local git-ignored check nahi hua (git repo nahi?)");
}

function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    if (["node_modules", ".next", ".git"].includes(f)) continue;
    const p = join(d, f), s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (s.size < 500000 && /\.(ts|tsx|js|mjs|json|md|sql|html|css|txt)$/.test(f) && f !== "package-lock.json") out.push(p);
  }
  return out;
}
function secrets() {
  const files = [];
  for (const d of ["src", "scripts", "supabase"]) if (existsSync(d)) walk(d, files);
  for (const f of readdirSync(".")) if (statSync(f).isFile() && /\.(md|txt|json|mjs|ts)$/.test(f) && f !== "package-lock.json") files.push(f);
  const vals = ["SUPABASE_SERVICE_ROLE_KEY", "LLM_API_KEY", "SESSION_SECRET", "ADMIN_PASSWORD"].map((k) => [k, E[k]]).filter(([, v]) => v && v.length >= 8);
  let hit = 0;
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    for (const [k, v] of vals) if (t.includes(v)) { bad(`${k} hardcoded in ${f}`); hit++; }
    if (/gsk_[A-Za-z0-9]{20,}/.test(t) || /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\./.test(t)) { bad(`key-like string in ${f}`); hit++; }
  }
  if (!hit) ok(`secrets scan clean (${files.length} files)`);
}

function staticChecks() {
  const sh = (cmd) => spawnSync(cmd, { shell: true, encoding: "utf8" });
  const t = sh("npx tsc --noEmit");
  t.status === 0 ? ok("typecheck pass") : bad("typecheck fail:\n" + (t.stdout + t.stderr).split("\n").slice(0, 15).join("\n"));
  const l = sh("npm run lint --silent");
  l.status === 0 ? ok("lint pass") : bad("lint fail:\n" + (l.stdout + l.stderr).split("\n").slice(0, 15).join("\n"));
  const a = sh("npm audit --omit=dev --audit-level=high");
  a.status === 0 ? ok("npm audit: no high/critical") : warn("npm audit ne high/critical dikhaye (npm audit chalao)");
}

async function services() {
  const h = await fetch(BASE + "/api/health", { signal: AbortSignal.timeout(15000) }).then((r) => r.status).catch(() => 0);
  h === 200 ? ok("app up (/api/health 200)") : bad(`app down (${h}) - npm run dev chalao`);

  const DB = E.NEXT_PUBLIC_SUPABASE_URL, K = E.SUPABASE_SERVICE_ROLE_KEY;
  const H = { apikey: K, Authorization: `Bearer ${K}` };
  const s = await fetch(`${DB}/rest/v1/app_settings?key=eq.chat_enabled&select=value`, { headers: H, signal: AbortSignal.timeout(15000) }).then((r) => r.json()).catch(() => null);
  if (Array.isArray(s) && s.length === 1) ok(`DB reachable, chat_enabled=${s[0].value}`);
  else bad("DB se app_settings nahi mila: migration 20261025_guards.sql chalaya hai?");

  const g = await fetch(`${DB}/rest/v1/rpc/hit_counter`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: "doctor:probe", p_limit: 1, p_expires: new Date(Date.now() + 60000).toISOString() }),
  }).then((r) => r.status).catch(() => 0);
  g === 200 ? ok("hit_counter function callable (service role)") : bad(`hit_counter ${g}: migration check karo`);

  const p = await fetch(`${BASE}/api/leads/00000000-0000-0000-0000-000000000000`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" })
    .then((r) => r.status).catch(() => 0);
  p === 404 ? ok("purana token route band (404)") : bad(`purana /api/leads/[id] ${p} de raha hai`);

  const q = await fetch(`${BASE}/api/leads`).then((r) => r.status).catch(() => 0);
  q === 405 ? ok("public GET /api/leads band (405)") : bad(`GET /api/leads ${q} de raha hai`);
}

console.log(STATIC ? "== doctor (static) ==" : "== doctor (full) ==");
structure(); env(); secrets();
if (STATIC) staticChecks(); else await services();
console.log(`\n${fails ? "❌ FAIL" : "✅ PASS"} | ${fails} fail, ${warns} warn`);
process.exit(fails ? 1 : 0);
