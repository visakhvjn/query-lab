import { NextResponse } from "next/server";
import { generateSchemaWithAI } from "@/lib/schema/generate";
import { listChallengeSchemas } from "@/lib/schema/list";
import { materializeSchema } from "@/lib/schema/materialize";

export async function GET() {
  try {
    const schemas = await listChallengeSchemas();
    return NextResponse.json({ ok: true, schemas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const generated = await generateSchemaWithAI();
    const { schema, statements, rowCounts } =
      await materializeSchema(generated);

    return NextResponse.json({
      ok: true,
      schemaName: schema.schemaName,
      description: schema.description,
      tables: schema.tables.map((t) => ({
        name: t.name,
        rows: rowCounts[t.name] ?? 0,
      })),
      rowCounts,
      statements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
