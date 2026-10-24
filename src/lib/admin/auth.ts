import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "lms_admin";
const TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_MAX_AGE = TTL_MS / 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET missing or too short");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSession(): string {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifySession(token: string | undefined): boolean {
  try {
    if (!token) return false;
    const [exp, sig] = token.split(".");
    if (!exp || !sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(sign(exp));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    return Number(exp) > Date.now();
  } catch {
    return false;
  }
}

export function passwordOk(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD ?? "";
  if (!real) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
