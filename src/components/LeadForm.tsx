"use client";
import { useState } from "react";
import type { Campaign } from "@/lib/campaigns";

type Status = "idle" | "loading" | "done" | "error";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-slate-700";

export default function LeadForm({ campaign }: { campaign: Campaign }) {
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const pick = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    };
    setStatus("loading");
    setErr("");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign,
          name: pick("name"),
          phone: pick("phone"),
          country: pick("country"),
          role: pick("role"),
          course: pick("course"),
          source: "website",
          consent: f.get("consent") === "on" ? true : false,
        }),
      });
      if (r.status === 429) throw new Error("Too many attempts. Please wait a minute and try again.");
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        throw new Error(
          r.status === 400
            ? "Please enter your name (min 2 characters) and a valid phone number (min 7 digits)."
            : "Something went wrong. Please try again.",
        );
      }
      form.reset();
      setStatus("done");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200">
        <p className="text-lg font-semibold">Thank you! 🎉</p>
        <p className="mt-1 text-sm">Your request is in. Our team will contact you shortly.</p>
        <button onClick={() => setStatus("idle")} className="mt-4 text-sm font-medium underline">
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">Book a Free Demo Class</h2>
      <div>
        <label htmlFor="lead-name" className={label}>Full name *</label>
        <input id="lead-name" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Ayesha Khan" className={field} />
      </div>
      <div>
        <label htmlFor="lead-phone" className={label}>Phone / WhatsApp *</label>
        <input id="lead-phone" name="phone" type="tel" inputMode="tel" required minLength={7} maxLength={20} autoComplete="tel" placeholder="e.g. 0300 1234567" className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-country" className={label}>Country</label>
          <input id="lead-country" name="country" maxLength={40} autoComplete="country-name" placeholder="e.g. Pakistan" className={field} />
        </div>
        <div>
          <label htmlFor="lead-role" className={label}>I am a</label>
          <select id="lead-role" name="role" defaultValue="" className={field}>
            <option value="">Select...</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="lead-course" className={label}>Course of interest (optional)</label>
        <input id="lead-course" name="course" maxLength={80} placeholder="e.g. AI basics" className={field} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input name="consent" type="checkbox" required className="mt-1" />
        I agree that the team may contact me by phone or WhatsApp about my demo request.
      </label>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">{err}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Book My Free Demo"}
      </button>
    </form>
  );
}
