import { NextResponse } from "next/server";
import { schemaExists } from "@/lib/schema/inspect";
import { isValidIdent } from "@/lib/schema/types";
import { getQuestion } from "@/lib/questions/store";
import { checkUserQuery } from "@/lib/sql/check";

type RouteContext = {
  params: Promise<{ schema: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

    const body = await request.json().catch(() => null);
    const questionNumber = Number(body?.questionNumber);
    const userSql = typeof body?.sql === "string" ? body.sql : "";

    if (
      !Number.isInteger(questionNumber) ||
      questionNumber < 1 ||
      questionNumber > 10
    ) {
      return NextResponse.json(
        { ok: false, error: "questionNumber must be an integer from 1 to 10" },
        { status: 400 },
      );
    }

    if (!userSql.trim()) {
      return NextResponse.json(
        { ok: false, error: "sql is required" },
        { status: 400 },
      );
    }

    const question = await getQuestion(schemaName, questionNumber);
    if (!question) {
      return NextResponse.json(
        {
          ok: false,
          error: `No question ${questionNumber} for schema "${schemaName}"`,
        },
        { status: 404 },
      );
    }

    const result = await checkUserQuery({
      schemaName,
      solutionSql: question.solutionSql,
      userSql,
    });

    return NextResponse.json({
      ok: true,
      correct: result.correct,
      reason: result.reason ?? null,
      orderMatters: result.orderMatters,
      result: result.userResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
