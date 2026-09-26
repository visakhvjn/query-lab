import { NextResponse } from "next/server";
import { AuthSecretError, assertAuthSecret } from "@/lib/auth";
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

export async function POST(request: Request) {
  try {
    assertAuthSecret(request);

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
    if (error instanceof AuthSecretError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
