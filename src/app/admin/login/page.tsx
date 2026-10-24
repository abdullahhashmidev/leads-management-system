"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!password) {
      setErr("Enter your password");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Login failed");
      router.replace("/admin");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="lcard" method="post" onSubmit={submit}>
        <div className="logo">LM</div>
        <h1>Leads Console</h1>
        <p className="sub">Sign in to manage leads and payments.</p>
        <label className="lbl" htmlFor="pw">Password</label>
        <input id="pw" name="password" className="input" type="password" autoComplete="current-password" autoFocus />
        {err && <div className="err">{err}</div>}
        <button className="btn pri" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} disabled={busy} type="submit">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
