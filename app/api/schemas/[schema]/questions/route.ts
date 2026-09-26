import { NextResponse } from "next/server";
import { inspectSchema, schemaExists } from "@/lib/schema/inspect";
import { isValidIdent } from "@/lib/schema/types";
import { generateQuestionsWithAI } from "@/lib/questions/generate";
import {
  listQuestionsForSchema,
  replaceQuestionsForSchema,
} from "@/lib/questions/store";

type RouteContext = {
  params: Promise<{ schema: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schema: rawSchema } = await context.params;
    const schemaName = decodeURIComponent(rawSchema);

    if (!isValidIdent(schemaName)) {
      return NextResponse.json(
        { ok: false, error: "Invalid schema name" },
        { status: 400 },
      );
    }

    if (!(await schemaExists(schemaName))) {
      return NextResponse.json(
        { ok: false, error: `Schema "${schemaName}" does not exist` },
        { status: 404 },
      );
    }

    const questions = await listQuestionsForSchema(schemaName);
    return NextResponse.json({
      ok: true,
      schemaName,
      count: questions.length,
      questions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { schema: rawSchema } = await context.params;
    const schemaName = decodeURIComponent(rawSchema);

    if (!isValidIdent(schemaName)) {
      return NextResponse.json(
        { ok: false, error: "Invalid schema name" },
        { status: 400 },
      );
    }

    if (!(await schemaExists(schemaName))) {
      return NextResponse.json(
        { ok: false, error: `Schema "${schemaName}" does not exist` },
        { status: 404 },
      );
    }

    const snapshot = await inspectSchema(schemaName);
    const generated = await generateQuestionsWithAI(snapshot);
    const questions = await replaceQuestionsForSchema(schemaName, generated);

    return NextResponse.json({
      ok: true,
      schemaName,
      count: questions.length,
      questions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
