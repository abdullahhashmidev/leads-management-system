const K = process.env.SUPABASE_SERVICE_ROLE_KEY, BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!K || !BASE) { console.error("env missing (.env.local)"); process.exit(1); }
const U = BASE + "/rest/v1";
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json", Prefer: "return=representation" };
async function api(method, path, body) {
  const r = await fetch(U + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : [];
}

let s = 20261004; // fixed seed: same data every run
const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const DAY = 864e5, now = Date.now(), iso = (ms) => new Date(ms).toISOString();

const names = ["Ayesha Khan","Hamza Ali","Fatima Zahra","Bilal Ahmed","Sana Malik","Usman Tariq","Hira Siddiqui","Zain Abbas","Maryam Iqbal","Omar Farooq","Noor Fatima","Ali Raza","Sara Hussain","Danish Shah","Iqra Javed","Hassan Mirza","Laiba Noman","Faizan Qureshi","Amna Sheikh","Talha Rehman","Mahnoor Aslam","Saad Butt","Zoya Anwar","Rayyan Khalid","Eman Saleem"];
const st = [...Array(7).fill("new"), ...Array(4).fill("qualified"), ...Array(5).fill("contacted"), ...Array(4).fill("demo_booked"), ...Array(4).fill("enrolled"), "lost"];
for (let i = st.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [st[i], st[j]] = [st[j], st[i]]; }
const summaries = ["Asked about fees and timings", "Wants a free demo class", "Interested in AI basics for a teenager", "Asked if classes are online", "Wants to join the next batch", "Asked about certificate and course duration"];

function score(role, campaign, intent) {
  let sc = 50;
  if (role === "student" || role === "professional") sc += 20;
  if (role === "entrepreneur") sc += 30;
  if (campaign === "accl") sc += 10;
  if (intent === "high") sc += 15; else if (intent === "medium") sc += 5;
  sc = Math.min(sc, 100);
  return { score: sc, temperature: sc >= 80 ? "hot" : sc < 50 ? "cold" : "warm" };
}

const rows = names.map((name, i) => {
  const campaign = i < 15 ? "accl" : "summer_camp";
  const status = st[i];
  const role = campaign === "accl" ? pick(["student", "student", "professional", "entrepreneur", "parent"]) : pick(["parent", "parent", "parent", "student"]);
  const source = pick(["chat", "chat", "form"]);
  const intent = source === "chat" ? pick(["high", "high", "medium", "low"]) : null;
  const ageDays = status === "enrolled" ? 8 + rnd() * 21 : ["demo_booked", "contacted", "lost"].includes(status) ? 3 + rnd() * 19 : rnd() * 29;
  const sc = score(role, campaign, intent);
  const open = ["new", "qualified", "contacted"].includes(status);
  const created = iso(now - ageDays * DAY - rnd() * DAY * 0.5);
  return {
    campaign, name, role, source, status, intent, ...sc,
    phone: "0399" + String(Math.floor(rnd() * 1e7)).padStart(7, "0"),
    country: campaign === "accl" ? pick(["Pakistan", "UAE", "UK", "Saudi Arabia", "Canada"]) : "Pakistan",
    course: campaign === "accl" ? pick(["AI Fundamentals", "Prompt Engineering", "Python for AI", "Generative AI"]) : pick(["Coding", "Robotics", "AI Basics", "Graphic Design"]),
    chat_summary: source === "chat" ? pick(summaries) : null,
    follow_up_at: open ? (sc.temperature === "hot" ? iso(now - 2 * 36e5) : iso(now + (1 + rnd() * 3) * DAY)) : null,
    is_dummy: true,
    created_at: created,
    consent_at: created, // dummy rows still need consent (DB constraint chk_consent)
  };
});

const fee = (l) => (l.campaign === "accl" ? { amount: 100, currency: "USD" } : { amount: 15000, currency: "PKR" });
const methods = (l) => (l.campaign === "accl" ? ["paypal", "bank", "jazzcash"] : ["jazzcash", "easypaisa", "bank", "cash"]);
function pay(l, status, dueMs, paidMs, plan, note = null) {
  const { amount, currency } = fee(l);
  const paid = status === "paid" ? amount : status === "partial" ? Math.round(amount / 2) : 0;
  const has = status === "paid" || status === "partial";
  return {
    lead_id: l.id, student_name: l.name, campaign: l.campaign, amount, amount_paid: paid, currency,
    method: pick(methods(l)), status, plan, due_date: iso(dueMs).slice(0, 10),
    paid_at: has ? iso(paidMs) : null, note, is_dummy: true,
    created_at: iso(has ? paidMs : new Date(l.created_at).getTime() + DAY),
  };
}

try {
  await api("DELETE", "/payments?is_dummy=eq.true");
  await api("DELETE", "/leads?phone=like.0399*");
  const leads = await api("POST", "/leads", rows);
  console.log("leads inserted:", leads.length, "| hot:", leads.filter((l) => l.temperature === "hot").length);

  const P = [];
  let advance = 0;
  for (const l of leads) {
    const c = new Date(l.created_at).getTime();
    if (l.status === "enrolled") {
      P.push(pay(l, "paid", c + 3 * DAY, c + 2 * DAY, "Month 1"));
      const due = now + (-6 + rnd() * 15) * DAY;
      const sB = due < now ? pick(["pending", "partial"]) : "pending";
      P.push(pay(l, sB, due, now - DAY, "Month 2"));
    } else if (l.status === "demo_booked") {
      P.push(pay(l, "pending", now + (2 + rnd() * 5) * DAY, null, "Registration fee"));
    } else if (l.status === "lost") {
      P.push(pay(l, "refunded", c + 3 * DAY, null, "Registration fee", "Refunded (demo data)"));
    } else if (l.status === "contacted" && advance < 2) {
      advance++;
      P.push(pay(l, "pending", now + 3 * DAY, null, "Advance booking"));
    }
  }
  const pays = await api("POST", "/payments", P);
  console.log("payments inserted:", pays.length);

  const notes = leads.filter((l) => l.status !== "new").slice(0, 6).map((l, i) => ({
    lead_id: l.id,
    body: ["Called, parent will confirm tomorrow", "Sent fee details on WhatsApp", "Demo class booked for Saturday", "Asked for a sibling discount", "Wants evening batch only", "Paid first installment, receipt sent"][i],
    created_at: iso(new Date(l.created_at).getTime() + (2 + i) * 36e5),
  }));
  await api("POST", "/lead_notes", notes);

  for (const cur of ["USD", "PKR"]) {
    const paid = pays.filter((p) => p.currency === cur).reduce((a, p) => a + Number(p.amount_paid), 0);
    console.log(`collected (${cur}):`, paid);
  }
  console.log("seed OK");
} catch (e) { console.error("SEED FAIL:", e.message); process.exit(1); }
