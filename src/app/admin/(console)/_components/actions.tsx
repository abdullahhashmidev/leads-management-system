"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

async function call(url: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
}
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/system", label: "System" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return <Link key={l.href} href={l.href} className={on ? "on" : ""}>{l.label}</Link>;
      })}
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  async function out() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }
  return <button className="btn sm" onClick={() => void out()}>Sign out</button>;
}

export function ThemeToggle() {
  useEffect(() => {
    const t = localStorage.getItem("lms-theme");
    if (t) document.querySelector(".adm")?.setAttribute("data-theme", t);
  }, []);
  function flip() {
    const el = document.querySelector(".adm");
    const next = el?.getAttribute("data-theme") === "dark" ? "light" : "dark";
    el?.setAttribute("data-theme", next);
    localStorage.setItem("lms-theme", next);
  }
  return <button className="btn sm" onClick={flip}>Light / Dark</button>;
}

export function StatusSelect({ id, value, options }: { id: string; value: string; options: readonly string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function change(next: string) {
    setBusy(true);
    setErr("");
    try {
      await call(`/api/admin/leads/${id}`, "PATCH", { status: next });
      router.refresh();
    } catch (e) {
      setErr(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <select className="input" value={value} disabled={busy} onChange={(e) => void change(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
      </select>
      {err && <div className="err">{err}</div>}
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function save() {
    setBusy(true);
    setErr("");
    try {
      await call(`/api/admin/leads/${id}/notes`, "POST", { body: text });
      setText("");
      router.refresh();
    } catch (e) {
      setErr(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <textarea className="input" rows={2} maxLength={1000} placeholder="Add a note (call result, promise, next step)" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn pri sm" style={{ marginTop: 8 }} disabled={busy || !text.trim()} onClick={() => void save()}>Add note</button>
      {err && <div className="err">{err}</div>}
    </div>
  );
}

export function MarkPaid({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pay() {
    setBusy(true);
    setErr("");
    try {
      await call(`/api/admin/payments/${id}`, "PATCH", { action: "mark_paid" });
      router.refresh();
    } catch (e) {
      setErr(message(e));
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn sm" disabled={busy} onClick={() => void pay()}>Mark paid</button>
      {err && <div className="err">{err}</div>}
    </>
  );
}
