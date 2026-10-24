// Deletes ONLY leads created by our own test scripts (source = doctor | e2e).
// Safe by default: prints what it would delete. Pass --apply to delete.
// Never touches payments, and never matches real names.
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) { console.error("env missing (.env.local)"); process.exit(1); }
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const rest = (p, init = {}) => fetch(`${U}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
const apply = process.argv.includes("--apply");
const SOURCES = ["doctor", "e2e"];

const r = await rest(`leads?select=id,name,source&source=in.(${SOURCES.join(",")})&limit=1000`);
if (!r.ok) { console.error("lookup failed", r.status, await r.text()); process.exit(1); }
const rows = await r.json();
console.log(`test leads found: ${rows.length}`);
if (!rows.length || !apply) { if (!apply) console.log("dry run. --apply se delete hoga."); process.exit(0); }
if (rows.length > 200) { console.error("bohot zyada rows, kuch delete nahi kiya"); process.exit(1); }

const ids = rows.map((x) => x.id);
const list = `(${ids.join(",")})`;
const n = await rest(`lead_notes?lead_id=in.${list}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
if (!n.ok) { console.error("delete notes failed", n.status); process.exit(1); }
const d = await rest(`leads?id=in.${list}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
if (!d.ok) { console.error("delete leads failed", d.status); process.exit(1); }
console.log(`deleted ${ids.length} test leads`);
