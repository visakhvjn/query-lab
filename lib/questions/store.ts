import sql from "@/lib/db";
import { isValidIdent } from "@/lib/schema/types";

export type ChallengeQuestion = {
  id: number;
  schemaName: string;
  questionNumber: number;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  solutionSql: string;
  createdAt: Date;
};

export async function ensureQuestionsTable() {
  await sql`
    create table if not exists public.sql_challenge_questions (
      id bigserial primary key,
      schema_name text not null,
      question_number integer not null check (question_number between 1 and 10),
      prompt text not null,
      difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
      topics text[] not null default '{}',
      solution_sql text not null,
      created_at timestamptz not null default now(),
      unique (schema_name, question_number)
    )
  `;
}

export type QuestionInput = {
  questionNumber: number;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  solutionSql: string;
};

export async function replaceQuestionsForSchema(
  schemaName: string,
  questions: QuestionInput[],
): Promise<ChallengeQuestion[]> {
  if (!isValidIdent(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }
  if (questions.length !== 10) {
    throw new Error("Exactly 10 questions are required");
  }

  await ensureQuestionsTable();

  await sql.begin(async (tx) => {
    await tx`
      delete from public.sql_challenge_questions
      where schema_name = ${schemaName}
    `;

    for (const q of questions) {
      await tx`
        insert into public.sql_challenge_questions (
          schema_name,
          question_number,
          prompt,
          difficulty,
          topics,
          solution_sql
        ) values (
          ${schemaName},
          ${q.questionNumber},
          ${q.prompt},
          ${q.difficulty},
          ${q.topics},
          ${q.solutionSql}
        )
      `;
    }
  });

  return listQuestionsForSchema(schemaName);
}

export async function listQuestionsForSchema(
  schemaName: string,
): Promise<ChallengeQuestion[]> {
  if (!isValidIdent(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }

  await ensureQuestionsTable();

  const rows = await sql<
    {
      id: number;
      schema_name: string;
      question_number: number;
      prompt: string;
      difficulty: "easy" | "medium" | "hard";
      topics: string[];
      solution_sql: string;
      created_at: Date;
    }[]
  >`
    select
      id,
      schema_name,
      question_number,
      prompt,
      difficulty,
      topics,
      solution_sql,
      created_at
    from public.sql_challenge_questions
    where schema_name = ${schemaName}
    order by question_number
  `;

  return rows.map((r) => ({
    id: Number(r.id),
    schemaName: r.schema_name,
    questionNumber: r.question_number,
    prompt: r.prompt,
    difficulty: r.difficulty,
    topics: r.topics ?? [],
    solutionSql: r.solution_sql,
    createdAt: r.created_at,
  }));
}

export async function getQuestion(
  schemaName: string,
  questionNumber: number,
): Promise<ChallengeQuestion | null> {
  if (!isValidIdent(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }

  await ensureQuestionsTable();

  const rows = await sql<
    {
      id: number;
      schema_name: string;
      question_number: number;
      prompt: string;
      difficulty: "easy" | "medium" | "hard";
      topics: string[];
      solution_sql: string;
      created_at: Date;
    }[]
  >`
    select
      id,
      schema_name,
      question_number,
      prompt,
      difficulty,
      topics,
      solution_sql,
      created_at
    from public.sql_challenge_questions
    where schema_name = ${schemaName}
      and question_number = ${questionNumber}
    limit 1
  `;

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    id: Number(r.id),
    schemaName: r.schema_name,
    questionNumber: r.question_number,
    prompt: r.prompt,
    difficulty: r.difficulty,
    topics: r.topics ?? [],
    solutionSql: r.solution_sql,
    createdAt: r.created_at,
  };
}
