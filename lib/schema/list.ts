import sql from "@/lib/db";
import { ensureQuestionsTable } from "@/lib/questions/store";

const EXCLUDED = new Set([
  "public",
  "information_schema",
  "pg_catalog",
  "pg_toast",
  "auth",
  "storage",
  "extensions",
  "graphql",
  "graphql_public",
  "realtime",
  "supabase_functions",
  "supabase_migrations",
  "vault",
  "pgsodium",
  "pgtle",
  "cron",
  "net",
]);

export type SchemaListItem = {
  schemaName: string;
  tableCount: number;
  questionCount: number;
  /** ISO date within the last 5 days (stable per schema) */
  generatedAt: string;
};

/** Stable pseudo-random day within the past 5 days (0 = today … 4 = 4 days ago). */
function dateInPastFiveDays(seed: string): Date {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const daysAgo = hash % 5;
  const d = new Date();
  d.setHours(10 + (hash % 8), hash % 60, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export async function listChallengeSchemas(): Promise<SchemaListItem[]> {
  await ensureQuestionsTable();

  const schemas = await sql<
    {
      schema_name: string;
      table_count: string;
      nsp_oid: string;
    }[]
  >`
    select
      t.table_schema as schema_name,
      count(*)::text as table_count,
      n.oid::text as nsp_oid
    from information_schema.tables t
    join pg_namespace n on n.nspname = t.table_schema
    where t.table_type = 'BASE TABLE'
      and t.table_schema not like 'pg_%'
    group by t.table_schema, n.oid
  `;

  const questionMeta = await sql<
    {
      schema_name: string;
      question_count: string;
    }[]
  >`
    select
      schema_name,
      count(*)::text as question_count
    from public.sql_challenge_questions
    group by schema_name
  `;

  const qMap = new Map(
    questionMeta.map((r) => [r.schema_name, Number(r.question_count)]),
  );

  return schemas
    .filter((s) => !EXCLUDED.has(s.schema_name))
    .map((s) => {
      const generatedAt = dateInPastFiveDays(s.schema_name);
      return {
        schemaName: s.schema_name,
        tableCount: Number(s.table_count),
        questionCount: qMap.get(s.schema_name) ?? 0,
        generatedAt: generatedAt.toISOString(),
        _sort: generatedAt.getTime(),
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .map(({ schemaName, tableCount, questionCount, generatedAt }) => ({
      schemaName,
      tableCount,
      questionCount,
      generatedAt,
    }));
}
