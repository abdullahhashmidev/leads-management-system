import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { UUID_RE, fail, ok } from "@/lib/admin/http";
import { db } from "@/lib/supabase";
import { logError } from "@/lib/log";

const Body = z.object({ action: z.literal("mark_paid") }).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("Invalid id", 400);
  if (!Body.safeParse(await req.json().catch(() => null)).success) return fail("Invalid body", 400);
  try {
    const cur = await db().from("payments").select("amount,status").eq("id", id).maybeSingle();
    if (cur.error) throw cur.error;
    if (!cur.data) return fail("Payment not found", 404);
    if (cur.data.status === "refunded") return fail("Refunded payments cannot be marked paid", 400);
    const { data, error } = await db()
      .from("payments")
      .update({ status: "paid", amount_paid: cur.data.amount, paid_at: new Date().toISOString() })
      .eq("id", id)
      .neq("status", "paid")
      .neq("status", "refunded")
      .select("id,status")
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("Payment was already settled by someone else. Refresh the page.", 409);
    return ok(data);
  } catch (e) {
    logError("admin.payments.PATCH", e);
    return fail("Update failed", 500);
  }
}
