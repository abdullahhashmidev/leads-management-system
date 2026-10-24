import { requireAdmin } from "@/lib/admin/auth";
import { CURRENCIES, getPayments, getSummary, isUnpaid } from "@/lib/admin/data";
import { CAMPAIGN_LABEL, money, todayIso } from "@/lib/admin/ui";
import { MarkPaid } from "../_components/actions";
import { StatusChip } from "../_components/ui";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireAdmin();
  const [s, rows] = await Promise.all([getSummary(), getPayments()]);
  const today = todayIso();

  return (
    <>
      <h1 className="t">Payments</h1>
      <p className="sub">Every fee in one ledger. PKR and USD are always shown separately, never converted.</p>

      <div className="cards">
        {CURRENCIES.map((c) => (
          <div className="card" key={c}>
            <div className="lbl">{c} position</div>
            <div className="val ok">{money(s.totals[c].collected, c)}</div>
            <div className="mut">
              Outstanding {money(s.totals[c].outstanding, c)} | overdue {money(s.totals[c].overdue, c)}
            </div>
          </div>
        ))}
        <div className="card">
          <div className="lbl">Export</div>
          <p className="mut">Download the full ledger for your accountant.</p>
          <a className="btn" href="/api/admin/export/payments">Download CSV</a>
        </div>
      </div>

      <div className="tw">
        {rows.length === 0 ? (
          <div className="empty">No payments yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Receipt</th><th>Student</th><th>Plan</th><th>Amount</th><th>Paid</th><th>Due</th><th>Method</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const late = isUnpaid(p) && p.due_date !== null && p.due_date < today;
                const pct = Math.min(100, Math.round((Number(p.amount_paid) / Number(p.amount)) * 100));
                return (
                  <tr key={p.id} className={late ? "late" : ""}>
                    <td className="mut">{p.receipt_no ?? "-"}</td>
                    <td>
                      <span className="nm">{p.student_name}</span>
                      <div className="mut">{CAMPAIGN_LABEL[p.campaign] ?? p.campaign}</div>
                    </td>
                    <td>{p.plan ?? "-"}</td>
                    <td><b>{money(Number(p.amount), p.currency)}</b></td>
                    <td>
                      <div className="prog"><i style={{ width: `${pct}%` }} /></div>
                      <div className="mut">{money(Number(p.amount_paid), p.currency)}</div>
                    </td>
                    <td>{p.due_date ?? "-"}{late && <div className="err">overdue</div>}</td>
                    <td>{p.method}</td>
                    <td><StatusChip value={p.status} /></td>
                    <td>{isUnpaid(p) && <MarkPaid id={p.id} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
