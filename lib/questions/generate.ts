import OpenAI from "openai";
import type { SchemaSnapshot } from "@/lib/schema/inspect";
import type { QuestionInput } from "@/lib/questions/store";

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function assertQuestions(value: unknown, schemaName: string): QuestionInput[] {
  if (!value || typeof value !== "object") {
    throw new Error("AI returned invalid questions payload");
  }

  const questions = (value as { questions?: unknown }).questions;
  if (!Array.isArray(questions) || questions.length !== 10) {
    throw new Error("AI must return exactly 10 questions");
  }

  const numbers = new Set<number>();

  return questions.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid question at index ${index}`);
    }
    const q = item as Record<string, unknown>;
    const questionNumber = Number(q.questionNumber);
    const prompt = String(q.prompt ?? "").trim();
    const difficulty = String(q.difficulty ?? "").trim().toLowerCase();
    const solutionSql = String(q.solutionSql ?? "").trim();
    const topics = Array.isArray(q.topics)
      ? q.topics.map((t) => String(t).trim()).filter(Boolean)
      : [];

    if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 10) {
      throw new Error(`Invalid questionNumber at index ${index}`);
    }
    if (numbers.has(questionNumber)) {
      throw new Error(`Duplicate questionNumber: ${questionNumber}`);
    }
    numbers.add(questionNumber);

    if (!prompt) throw new Error(`Empty prompt for question ${questionNumber}`);
    if (!DIFFICULTIES.has(difficulty)) {
      throw new Error(`Invalid difficulty for question ${questionNumber}`);
    }
    if (!solutionSql) {
      throw new Error(`Missing solutionSql for question ${questionNumber}`);
    }
    if (!/^\s*(with|select)\b/i.test(solutionSql)) {
      throw new Error(
        `solutionSql for question ${questionNumber} must be a SELECT/WITH query`,
      );
    }
    // Solutions must target the challenge schema, not public system catalogs.
    if (!solutionSql.includes(schemaName)) {
      throw new Error(
        `solutionSql for question ${questionNumber} must reference schema "${schemaName}"`,
      );
    }

    return {
      questionNumber,
      prompt,
      difficulty: difficulty as QuestionInput["difficulty"],
      topics,
      solutionSql,
    };
  });
}

export async function generateQuestionsWithAI(
  snapshot: SchemaSnapshot,
): Promise<QuestionInput[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in .env.local");
  }

  const client = new OpenAI({ apiKey });

  const schemaSummary = {
    schemaName: snapshot.schemaName,
    tables: snapshot.tables.map((t) => ({
      name: t.name,
      columns: t.columns,
      sampleRows: t.sampleRows,
    })),
  };

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sql_challenge_questions",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["questions"],
          properties: {
            questions: {
              type: "array",
              minItems: 10,
              maxItems: 10,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "questionNumber",
                  "prompt",
                  "difficulty",
                  "topics",
                  "solutionSql",
                ],
                properties: {
                  questionNumber: { type: "integer" },
                  prompt: { type: "string" },
                  difficulty: {
                    type: "string",
                    enum: ["easy", "medium", "hard"],
                  },
                  topics: {
                    type: "array",
                    items: { type: "string" },
                  },
                  solutionSql: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `You write SQL practice questions for a specific Postgres schema.
Return exactly 10 questions numbered 1-10.
Mix difficulties: about 4 easy, 4 medium, 2 hard.
Cover joins, filters, aggregates, grouping, ordering, and at least one multi-table question.
Each prompt should be a clear natural-language task (not the SQL itself).
solutionSql must be a single valid Postgres SELECT (WITH allowed) that answers the question.
Always qualify tables as "${snapshot.schemaName}.table_name".
Do not use DDL/DML (no INSERT/UPDATE/DELETE/DROP/CREATE).
Use only tables/columns that exist in the provided schema snapshot.`,
      },
      {
        role: "user",
        content: `Create 10 SQL questions for this schema snapshot:\n${JSON.stringify(schemaSummary)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned non-JSON content");
  }

  return assertQuestions(parsed, snapshot.schemaName);
}
