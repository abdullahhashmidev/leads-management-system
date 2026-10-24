import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { UUID_RE, fail, ok } from "@/lib/admin/http";
import { STATUSES } from "@/lib/admin/data";
import { db } from "@/lib/supabase";
import { logError } from "@/lib/log";

const Patch = z
  .object({ status: z.enum(STATUSES).optional(), follow_up_at: z.string().datetime().nullable().optional() })
  .strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("Invalid id", 400);
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return fail("Invalid body", 400);
  try {
    const { data, error } = await db().from("leads").update(parsed.data).eq("id", id).select("id,status,follow_up_at").maybeSingle();
    if (error) throw error;
    if (!data) return fail("Lead not found", 404);
    return ok(data);
  } catch (e) {
    logError("admin.leads.PATCH", e);
    return fail("Update failed", 500);
  }
}
