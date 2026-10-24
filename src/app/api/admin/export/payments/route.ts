import { isAdmin } from "@/lib/admin/auth";
import { fail } from "@/lib/admin/http";
import { getPayments } from "@/lib/admin/data";
import { logError } from "@/lib/log";

// Escapes quotes and neutralises spreadsheet formula injection (= + - @).
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await isAdmin())) return fail("Unauthorized", 401);
  try {
    const rows = await getPayments(2000);
    const cols = ["receipt_no", "student_name", "campaign", "plan", "amount", "amount_paid", "currency", "method", "status", "due_date", "paid_at", "created_at"] as const;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="payments.csv"' },
    });
  } catch (e) {
    logError("admin.export.GET", e);
    return fail("Export failed", 500);
  }
}
