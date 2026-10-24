import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { CURRENCIES, STATUSES, getSummary } from "@/lib/admin/data";
import { CAMPAIGN_LABEL, ago, money, waLink } from "@/lib/admin/ui";
import { Temp } from "./_components/ui";

export const dynamic = "force-dynamic";

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card">
      <div className="lbl">{label}</div>
      <div className={`val ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

export default async function OverviewPage() {
  await requireAdmin();
  const s = await getSummary();
  const peak = Math.max(1, ...s.days.map((d) => d.count));

  return (
    <>
      <h1 className="t">Overview</h1>
      <p className="sub">Who needs a call now, how much money is in, and how the funnel looks.</p>

      <div className="cards">
        <Kpi label="Total leads" value={s.total} />
        <Kpi label="Hot leads waiting" value={s.hotWaiting} tone="hot" />
        <Kpi label="Demos booked" value={s.byStatus.demo_booked ?? 0} />
        <Kpi label="Enrolled" value={s.byStatus.enrolled ?? 0} tone="ok" />
      </div>

      <div className="cards">
        {CURRENCIES.map((c) => (
          <div className="card" key={c}>
            <div className="lbl">Collected ({c})</div>
            <div className="val ok">{money(s.totals[c].collected, c)}</div>
            <div className="mut">
              Outstanding {money(s.totals[c].outstanding, c)}
              {s.totals[c].overdue > 0 ? ` | overdue ${money(s.totals[c].overdue, c)}` : ""}
            </div>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Needs follow-up now</h2>
          {s.followUps.length === 0 && <div className="empty">Nothing is waiting. Nice work.</div>}
          {s.followUps.map((l) => (
            <div className="row" key={l.id}>
              <div>
                <Link className="nm" href={`/admin/leads?lead=${l.id}`}>{l.name}</Link>{" "}
                <Temp value={l.temperature} />
                <div className="mut">{CAMPAIGN_LABEL[l.campaign] ?? l.campaign} | follow-up {ago(l.follow_up_at)}</div>
              </div>
              <a className="btn sm" href={waLink(l.phone, l.name)} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>New leads, last 14 days</h2>
          <div className="bars">
            {s.days.map((d) => (
              <div className="col" key={d.label} title={`${d.label}: ${d.count}`}>
                <b>{d.count || ""}</b>
                <div className="bar" style={{ height: `${(d.count / peak) * 80}%` }} />
                <span>{d.label.slice(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Funnel by campaign</h2>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Campaign</th>
                {STATUSES.map((st) => <th key={st}>{st.replace("_", " ")}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(s.funnel).map(([camp, counts]) => (
                <tr key={camp}>
                  <td className="nm">{CAMPAIGN_LABEL[camp] ?? camp}</td>
                  {STATUSES.map((st) => <td key={st}>{counts[st] ?? 0}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
