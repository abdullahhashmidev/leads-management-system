import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { UUID_RE, fail, ok } from "@/lib/admin/http";
import { db } from "@/lib/supabase";
import { logError } from "@/lib/log";

const Body = z.object({ body: z.string().trim().min(1).max(1000) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("Invalid id", 400);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Note must be 1-1000 characters", 400);
  try {
    const { data, error } = await db().from("lead_notes").insert({ lead_id: id, body: parsed.data.body }).select("id").single();
    if (error) throw error;
    return ok(data);
  } catch (e) {
    logError("admin.notes.POST", e);
    return fail("Could not save note", 500);
  }
}
