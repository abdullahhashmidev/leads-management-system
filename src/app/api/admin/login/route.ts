import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession, passwordOk } from "@/lib/admin/auth";
import { fail } from "@/lib/admin/http";
import { clientIp, hitCounter } from "@/lib/ratelimit";

const Body = z.object({ password: z.string().min(1).max(200) }).strict();

export async function POST(req: Request) {
  try {
    // Every attempt counts, successful or not: 5 per IP per 10 minutes, shared across all instances.
    if (!(await hitCounter(`rl:login:${clientIp(req)}`, 5, 10 * 60_000))) {
      return fail("Too many attempts. Try again in a few minutes.", 429);
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !passwordOk(parsed.data.password)) return fail("Invalid password", 401);

    let token: string;
    try {
      token = createSession();
    } catch {
      return fail("Server is not configured (SESSION_SECRET)", 500);
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch {
    return fail("Login is unavailable right now.", 503);
  }
}
