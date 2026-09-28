import { NextResponse } from "next/server";
import { AuthSecretError, assertAuthSecret } from "@/lib/auth";
import { generateQuestionsWithAI } from "@/lib/questions/generate";
import { replaceQuestionsForSchema } from "@/lib/questions/store";
import { generateSchemaWithAI } from "@/lib/schema/generate";
import { inspectSchema } from "@/lib/schema/inspect";
import { materializeSchema } from "@/lib/schema/materialize";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    assertAuthSecret(request);
  } catch (error) {
    if (error instanceof AuthSecretError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }

  let schemaName: string;
  let description: string;
  let rowCounts: Record<string, number>;

  try {
    const generated = await generateSchemaWithAI();
    const result = await materializeSchema(generated);
    schemaName = result.schema.schemaName;
    description = result.schema.description;
    rowCounts = result.rowCounts;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, stage: "schema", error: message },
      { status: 500 },
    );
  }

  try {
    const snapshot = await inspectSchema(schemaName);
    const generatedQuestions = await generateQuestionsWithAI(snapshot);
    const questions = await replaceQuestionsForSchema(
      schemaName,
      generatedQuestions,
    );

    return NextResponse.json({
      ok: true,
      schemaName,
      description,
      rowCounts,
      questionCount: questions.length,
      questions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        stage: "questions",
        schemaName,
        error: `Schema "${schemaName}" was created but question generation failed: ${message}. Retry with POST /api/schemas/${schemaName}/questions.`,
      },
      { status: 500 },
    );
  }
}
