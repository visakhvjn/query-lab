import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const [row] = await sql`select now() as now, current_database() as db`;
    return NextResponse.json({
      ok: true,
      database: row.db,
      serverTime: row.now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
