import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { db } from "@/lib/supabase";
export async function GET() {
  try {
    getEnv();
    const { error } = await db().from("leads").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("health", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
