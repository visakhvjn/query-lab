import { after, NextResponse } from "next/server";
import { AuthSecretError, assertAuthSecret } from "@/lib/auth";
import { generateQuestionsWithAI } from "@/lib/questions/generate";
import { replaceQuestionsForSchema } from "@/lib/questions/store";
import { generateSchemaWithAI } from "@/lib/schema/generate";
import { inspectSchema } from "@/lib/schema/inspect";
import { materializeSchema } from "@/lib/schema/materialize";

export const maxDuration = 300;

const LOG_PREFIX = "[challenges]";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function runChallengeGeneration(): Promise<void> {
  console.log(`${LOG_PREFIX} generation started`);

  let schemaName: string;
  try {
    const generated = await generateSchemaWithAI();
    const result = await materializeSchema(generated);
    schemaName = result.schema.schemaName;
    console.log(`${LOG_PREFIX} schema created: ${schemaName}`);
  } catch (error) {
    console.error(
      `${LOG_PREFIX} schema step failed: ${errorMessage(error)}`,
      error,
    );
    return;
  }

  try {
    const snapshot = await inspectSchema(schemaName);
    const generatedQuestions = await generateQuestionsWithAI(snapshot);
    const questions = await replaceQuestionsForSchema(
      schemaName,
      generatedQuestions,
    );
    console.log(
      `${LOG_PREFIX} questions generated: ${schemaName} (${questions.length})`,
    );
  } catch (error) {
    console.error(
      `${LOG_PREFIX} questions step failed for "${schemaName}": ${errorMessage(error)}. Retry with POST /api/schemas/${schemaName}/questions`,
      error,
    );
  }
}

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
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 },
    );
  }

  after(runChallengeGeneration);

  return NextResponse.json(
    {
      ok: true,
      status: "started",
      message: "Challenge generation started in the background.",
    },
    { status: 202 },
  );
}
