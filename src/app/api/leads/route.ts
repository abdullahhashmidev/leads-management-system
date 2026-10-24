import { NextResponse } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/log";
import { clientIp, hitCounter } from "@/lib/ratelimit";
import { createLead, hasRecentLead } from "@/lib/leads";

const LeadSchema = z.object({
  campaign: z.enum(["summer_camp", "accl"]),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(25)
    .refine((p) => p.replace(/\D/g, "").length >= 7 && p.replace(/\D/g, "").length <= 15, "Enter a valid phone number")
    .transform((p) => p.replace(/[^\d+]/g, "")),
  country: z.string().max(40).optional(),
  role: z.string().max(40).optional(),
  course: z.string().max(80).optional(),
  source: z.string().max(40).default("website"),
  consent: z.literal(true),
});

// Public write-only endpoint. Leads are read only in the owner console (session cookie).
export async function POST(req: Request) {
  try {
    if (!(await hitCounter(`rl:lead:${clientIp(req)}`, 8, 60_000))) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please wait a minute." }, { status: 429 });
    }
    const parsed = LeadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    // Same phone within 24h is one lead. Nothing internal (id, score, phone) goes back to the visitor.
    if (!(await hasRecentLead(d.phone))) {
      await createLead({
        campaign: d.campaign, name: d.name, phone: d.phone, country: d.country, role: d.role,
        course: d.course, source: d.source, consent_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    logError("leads.POST", e);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
