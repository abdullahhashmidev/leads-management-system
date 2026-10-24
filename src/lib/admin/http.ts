import { NextResponse } from "next/server";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ok = (data?: unknown) => NextResponse.json({ ok: true, data });
export const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });
