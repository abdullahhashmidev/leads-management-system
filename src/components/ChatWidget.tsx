"use client";
import { useEffect, useRef, useState } from "react";
import { CAMPAIGNS, type Campaign } from "@/lib/campaigns";

type Msg = { role: "user" | "assistant"; content: string; t: number; error?: boolean };
type Contact = { name: string; phone: string; role?: "parent" | "student"; time?: "morning" | "afternoon" | "evening"; consent: true };

const WA = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const START_CHIPS = ["What is the fee?", "Which courses do you offer?", "How can I book a free demo?"];
const bubble = "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 leading-relaxed";
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600";

const store = {
  get(k: string): string | null {
    try {
      return window.sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      window.sessionStorage.setItem(k, v);
    } catch {
      /* storage blocked (private mode) */
    }
  },
};

function load(key: string): { msgs: Msg[]; saved: boolean } {
  const empty = { msgs: [] as Msg[], saved: false };
  try {
    const v = JSON.parse(store.get(key) ?? "null") as { msgs?: unknown; saved?: unknown } | null;
    if (!v || !Array.isArray(v.msgs)) return empty;
    const ok = (m: unknown): m is Msg => {
      const x = m as Partial<Msg> | null;
      return !!x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string" && typeof x.t === "number";
    };
    return { msgs: v.msgs.filter(ok).slice(-30), saved: v.saved === true };
  } catch {
    return empty;
  }
}

const toApi = (list: Msg[]) =>
  list.filter((m) => !m.error).slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
const timeOf = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
// Only called from event handlers (never during render).
const now = () => Date.now();

function LeadCard({ busy, error, onSubmit, onCancel }: { busy: boolean; error: string; onSubmit: (c: Contact) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Contact["role"]>("parent");
  const [time, setTime] = useState<Contact["time"]>("evening");
  const [local, setLocal] = useState("");
  const [consent, setConsent] = useState(false);

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setLocal("Please tick the consent box to continue.");
      return;
    }
    if (name.trim().length < 2) {
      setLocal("Please enter your name.");
      return;
    }
    const d = phone.replace(/\D/g, "");
    if (d.length < 7 || d.length > 15) {
      setLocal("Please enter a valid phone number.");
      return;
    }
    setLocal("");
    onSubmit({ name: name.trim(), phone: phone.trim(), role, time, consent: true });
  }

  return (
    <form onSubmit={go} className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
      <p className="text-sm font-semibold text-slate-800">Book your free demo class</p>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" aria-label="Your name" placeholder="Your name" className={field} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={25} type="tel" inputMode="tel" autoComplete="tel" aria-label="Phone number" placeholder="Phone / WhatsApp number" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <select value={role} onChange={(e) => setRole(e.target.value as Contact["role"])} aria-label="I am a" className={field}>
          <option value="parent">I am a parent</option>
          <option value="student">I am a student</option>
        </select>
        <select value={time} onChange={(e) => setTime(e.target.value as Contact["time"])} aria-label="Preferred time" className={field}>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        The team may contact me by phone or WhatsApp about my demo request.
      </label>
      {(local || error) && <p className="text-xs text-red-600">{local || error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Sending..." : "Request free demo"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Cancel</button>
      </div>
    </form>
  );
}

export default function ChatWidget({ campaign }: { campaign: Campaign }) {
  const key = `lms-chat:${campaign}`;
  const label = CAMPAIGNS[campaign].tab;
  const [stored] = useState(() => load(key));
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(stored.msgs);
  const [saved, setSaved] = useState(stored.saved);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [handoff, setHandoff] = useState(false);
  const [card, setCard] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardErr, setCardErr] = useState("");
  const [teaser, setTeaser] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open, saved, card, handoff]);

  useEffect(() => {
    store.set(key, JSON.stringify({ msgs: msgs.slice(-30), saved }));
  }, [key, msgs, saved]);

  useEffect(() => {
    if (open || msgs.length > 0 || store.get(`${key}:teaser`)) return;
    const id = window.setTimeout(() => setTeaser(true), 8000);
    return () => window.clearTimeout(id);
  }, [open, msgs.length, key]);

  const showTeaser = teaser && !open && msgs.length === 0;
  const last = msgs[msgs.length - 1];
  const shown = chips.length ? chips : msgs.length === 0 ? START_CHIPS : [];

  function dismissTeaser() {
    store.set(`${key}:teaser`, "1");
    setTeaser(false);
  }

  async function run(history: Msg[]) {
    setBusy(true);
    setChips([]);
    setHandoff(false);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign, leadSaved: saved, messages: toApi(history) }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 429) throw new Error("rate");
      if (!r.ok || !j?.ok) throw new Error("fail");
      setMsgs([...history, { role: "assistant", content: String(j.reply), t: now() }]);
      setChips(Array.isArray(j.suggestions) ? j.suggestions.filter((s: unknown) => typeof s === "string").slice(0, 3) : []);
      setHandoff(j.handoff === true);
      if (j.leadSaved) setSaved(true);
    } catch (ex) {
      const rate = ex instanceof Error && ex.message === "rate";
      setMsgs([
        ...history,
        {
          role: "assistant",
          error: true,
          t: now(),
          content: rate
            ? "You are sending messages too quickly. Please wait a minute and try again."
            : "Sorry, I can't answer right now. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function send(raw: string) {
    const content = raw.trim().slice(0, 500);
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content, t: now() }];
    setMsgs(next);
    setText("");
    run(next);
  }

  function retry() {
    const base = msgs.slice(0, -1);
    setMsgs(base);
    run(base);
  }

  async function submitContact(c: Contact) {
    setCardBusy(true);
    setCardErr("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign, messages: toApi(msgs), contact: c }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 429) {
        setCardErr("Too many attempts. Please wait a minute.");
        return;
      }
      if (!r.ok || !j?.ok) {
        setCardErr(typeof j?.error === "string" ? j.error : "Please check your details and try again.");
        return;
      }
      setSaved(true);
      setCard(false);
      setMsgs([...msgs, { role: "assistant", content: String(j.reply), t: now() }]);
    } catch {
      setCardErr("Network problem. Please try again.");
    } finally {
      setCardBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {showTeaser && (
        <div className="flex max-w-[16rem] items-start gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-lg ring-1 ring-slate-200">
          <button
            onClick={() => {
              setOpen(true);
              dismissTeaser();
            }}
            className="text-left"
          >
            👋 Questions about fees or a free demo? Ask me!
          </button>
          <button onClick={dismissTeaser} aria-label="Dismiss" className="text-slate-400">✕</button>
        </div>
      )}
      {open && (
        <section
          aria-label="Admissions chat"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="flex h-[34rem] max-h-[80vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 max-sm:fixed max-sm:inset-0 max-sm:h-auto max-sm:max-h-none max-sm:w-auto max-sm:max-w-none max-sm:rounded-none"
        >
          <header className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">AI</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{label} Admissions</p>
              <p className="flex items-center gap-1.5 text-xs text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Online · replies in seconds
              </p>
            </div>
            {WA && (
              <a
                href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hi, I have a question about ${label}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25"
              >
                WhatsApp
              </a>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-lg leading-none">✕</button>
          </header>

          <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-white p-3 text-sm">
            <p className={`${bubble} bg-slate-100 text-slate-800`}>
              Hi! I&apos;m the {label} admissions assistant. Ask me about fees, courses or booking a free demo class.
            </p>
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <p
                  className={
                    m.role === "user"
                      ? `${bubble} bg-indigo-600 text-white`
                      : m.error
                        ? `${bubble} bg-red-50 text-red-700`
                        : `${bubble} bg-slate-100 text-slate-800`
                  }
                >
                  {m.content}
                </p>
                <span className="mt-0.5 px-1 text-[10px] text-slate-400">{timeOf(m.t)}</span>
              </div>
            ))}
            {last?.error && !busy && (
              <button onClick={retry} className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50">Try again</button>
            )}
            {handoff && !card && (
              <div className="flex flex-wrap gap-2">
                {WA && (
                  <a
                    href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hi, I need help with ${label}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Chat with our team on WhatsApp
                  </a>
                )}
                {!saved && (
                  <button onClick={() => setCard(true)} className="rounded-full border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700">
                    Leave my details
                  </button>
                )}
              </div>
            )}
            {card && !saved && <LeadCard busy={cardBusy} error={cardErr} onSubmit={submitContact} onCancel={() => setCard(false)} />}
            {saved && (
              <p className="text-center text-xs text-emerald-600">✓ Your details were saved. Our team will contact you shortly.</p>
            )}
            {busy && (
              <div className="flex w-14 items-center justify-center gap-1 rounded-2xl bg-slate-100 py-3" aria-label="Assistant is typing">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            )}
            <div ref={end} />
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-3 pb-1 pt-2">
            {!saved && !card && (
              <button onClick={() => setCard(true)} className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                📅 Book free demo
              </button>
            )}
            {shown.map((c) => (
              <button
                key={c}
                disabled={busy}
                onClick={() => send(c)}
                className="shrink-0 rounded-full border border-indigo-200 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex gap-2 p-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              aria-label="Your question"
              placeholder="Type your question..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-slate-400">AI assistant · please don&apos;t share passwords or payment details</p>
        </section>
      )}
      <button
        onClick={() => {
          setOpen(!open);
          dismissTeaser();
        }}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white shadow-lg transition hover:bg-indigo-700 ${open ? "max-sm:hidden" : ""}`}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
