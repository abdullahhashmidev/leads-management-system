import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { runHealth } from "@/lib/admin/health";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  await requireAdmin();
  const checks = await runHealth();
  const bad = checks.filter((c) => !c.ok).length;
  return (
    <>
      <h1 className="t">System health</h1>
      <p className="sub">
        Live checks of the lead pipeline: database, automation, alerts and AI. {bad === 0 ? "All systems operational." : `${bad} need attention.`}
      </p>
      <div className="cards">
        {checks.map((c) => (
          <div className="card" key={c.name}>
            <div className="lbl">{c.name}</div>
            <div className={`val ${c.ok ? "ok" : "hot"}`} style={{ fontSize: "1.15rem" }}>{c.ok ? "Healthy" : "Down"}</div>
            <div className="mut">{c.detail}{c.ms !== undefined ? ` · ${c.ms} ms` : ""}</div>
          </div>
        ))}
      </div>
      <p className="mut"><Link href="/admin/system">Re-run checks</Link> · checked at {new Date().toLocaleTimeString("en-GB")}</p>
    </>
  );
}
