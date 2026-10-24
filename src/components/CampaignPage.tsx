import Link from "next/link";
import LeadForm from "./LeadForm";
import ChatLoader from "./ChatLoader";
import { CAMPAIGNS, type Campaign } from "@/lib/campaigns";

export default function CampaignPage({ campaign }: { campaign: Campaign }) {
  const c = CAMPAIGNS[campaign];
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <Link href="/" className="text-lg font-bold text-indigo-700">Admissions</Link>
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
          {(Object.keys(CAMPAIGNS) as Campaign[]).map((k) => (
            <Link
              key={k}
              href={CAMPAIGNS[k].path}
              aria-current={k === campaign ? "page" : undefined}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                (k === campaign ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100")
              }
            >
              {CAMPAIGNS[k].tab}
            </Link>
          ))}
        </div>
      </nav>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-10 md:grid-cols-2 md:items-start">
        <div>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">{c.badge}</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900">{c.title}</h1>
          <p className="mt-4 text-lg text-slate-600">{c.sub}</p>
          <ul className="mt-6 space-y-2">
            {c.points.map((p) => (
              <li key={p} className="flex items-center gap-2 text-slate-700">
                <span aria-hidden className="text-emerald-600">✔</span> {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-500">Questions about fees or courses? Use the chat in the bottom-right corner.</p>
        </div>
        <LeadForm campaign={campaign} />
      </section>

      <ChatLoader campaign={campaign} />
    </main>
  );
}
