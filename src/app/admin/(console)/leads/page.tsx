import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { UUID_RE } from "@/lib/admin/http";
import { CAMPAIGNS, STATUSES, TEMPS, getLead, getLeads } from "@/lib/admin/data";
import { breakdown } from "@/lib/admin/scoring";
import { CAMPAIGN_LABEL, ago, money, waLink } from "@/lib/admin/ui";
import { NoteForm, StatusSelect } from "../_components/actions";
import { StatusChip, Temp } from "../_components/ui";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const only = (v: string, list: readonly string[]) => (list.includes(v) ? v : undefined);

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const f = {
    q: one(sp.q).slice(0, 40),
    campaign: only(one(sp.campaign), CAMPAIGNS),
    temp: only(one(sp.temp), TEMPS),
    status: only(one(sp.status), STATUSES),
    real: one(sp.real) === "1",
  };
  const leadId = one(sp.lead);
  const [leads, detail] = await Promise.all([
    getLeads(f),
    UUID_RE.test(leadId) ? getLead(leadId) : Promise.resolve(null),
  ]);

  const base = new URLSearchParams();
  if (f.q) base.set("q", f.q);
  if (f.campaign) base.set("campaign", f.campaign);
  if (f.temp) base.set("temp", f.temp);
  if (f.status) base.set("status", f.status);
  if (f.real) base.set("real", "1");
  const link = (extra?: Record<string, string>) => {
    const p = new URLSearchParams(base);
    for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
    const qs = p.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  };

  const d = detail;
  const why = d ? breakdown(d.lead) : null;

  return (
    <>
      <h1 className="t">Leads</h1>
      <p className="sub">{leads.length} shown. Click a name to open the lead, add notes, or change status.</p>

      <form className="filters" method="get">
        <input className="input" name="q" placeholder="Search name or phone" defaultValue={f.q} />
        <select className="input" name="campaign" defaultValue={f.campaign ?? ""}>
          <option value="">All campaigns</option>
          {CAMPAIGNS.map((c) => <option key={c} value={c}>{CAMPAIGN_LABEL[c]}</option>)}
        </select>
        <select className="input" name="temp" defaultValue={f.temp ?? ""}>
          <option value="">Any temperature</option>
          {TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input" name="status" defaultValue={f.status ?? ""}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <label className="mut"><input type="checkbox" name="real" value="1" defaultChecked={f.real} /> Hide demo data</label>
        <button className="btn pri" type="submit">Filter</button>
        <Link className="btn" href="/admin/leads">Reset</Link>
      </form>

      <div className="tw">
        {leads.length === 0 ? (
          <div className="empty">No leads match these filters.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Lead</th><th>Campaign</th><th>Score</th><th>Temp</th><th>Status</th><th>Source</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className={d?.lead.id === l.id ? "sel" : ""}>
                  <td>
                    <Link className="nm" href={link({ lead: l.id })}>{l.name}</Link>
                    <div className="mut">{l.phone}</div>
                  </td>
                  <td>{CAMPAIGN_LABEL[l.campaign] ?? l.campaign}</td>
                  <td><b>{l.score ?? "-"}</b></td>
                  <td><Temp value={l.temperature} /></td>
                  <td><StatusChip value={l.status} /></td>
                  <td>{l.source ?? "-"}</td>
                  <td className="mut">{ago(l.created_at)}</td>
                  <td><a className="btn sm" href={waLink(l.phone, l.name)} target="_blank" rel="noreferrer">WhatsApp</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {d && why && (
        <>
          <Link className="overlay" href={link()} aria-label="Close" />
          <aside className="drawer">
            <Link className="btn sm" href={link()} style={{ float: "right" }}>Close</Link>
            <h2>{d.lead.name}</h2>
            <div>
              <Temp value={d.lead.temperature} /> <StatusChip value={d.lead.status} />{" "}
              {d.lead.is_dummy && <span className="chip">demo data</span>}
            </div>
            <div className="acts">
              <a className="btn pri sm" href={waLink(d.lead.phone, d.lead.name)} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn sm" href={`tel:${d.lead.phone}`}>Call {d.lead.phone}</a>
            </div>

            <div className="sec">
              <h3>Status</h3>
              <StatusSelect id={d.lead.id} value={d.lead.status} options={STATUSES} />
            </div>

            <div className="sec">
              <h3>Why this score ({d.lead.score ?? why.total})</h3>
              {why.parts.map((p) => (
                <div className="row" key={p.label}><span>{p.label}</span><b>+{p.points}</b></div>
              ))}
            </div>

            <div className="sec">
              <h3>Details</h3>
              <dl className="kv">
                <dt>Campaign</dt><dd>{CAMPAIGN_LABEL[d.lead.campaign] ?? d.lead.campaign}</dd>
                <dt>Role</dt><dd>{d.lead.role ?? "-"}</dd>
                <dt>Course</dt><dd>{d.lead.course ?? "-"}</dd>
                <dt>Country</dt><dd>{d.lead.country ?? "-"}</dd>
                <dt>Source</dt><dd>{d.lead.source ?? "-"}</dd>
                <dt>Follow-up</dt><dd>{ago(d.lead.follow_up_at)}</dd>
                <dt>Created</dt><dd>{ago(d.lead.created_at)}</dd>
              </dl>
              {d.lead.chat_summary && <p className="mut">Chat: {d.lead.chat_summary}</p>}
            </div>

            {d.payments.length > 0 && (
              <div className="sec">
                <h3>Payments</h3>
                {d.payments.map((p) => (
                  <div className="row" key={p.id}>
                    <span>{p.plan ?? "Payment"} <StatusChip value={p.status} /></span>
                    <b>{money(Number(p.amount), p.currency)}</b>
                  </div>
                ))}
              </div>
            )}

            <div className="sec">
              <h3>Notes</h3>
              <NoteForm id={d.lead.id} />
              {d.notes.map((n) => (
                <div className="note" key={n.id}>
                  <p>{n.body}</p>
                  <span className="mut">{ago(n.created_at)}</span>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
