import sql from "@/lib/db";
import { ensureQuestionsTable } from "@/lib/questions/store";

export type SchemaListItem = {
  schemaName: string;
  tableCount: number;
  questionCount: number;
  generatedAt: string;
};

export async function ensureSchemaMetadataTable() {
  await sql`create schema if not exists schema_metadata`;
  await sql`
    create table if not exists schema_metadata.schemas (
      id bigserial primary key,
      schema_name text not null unique,
      created_at timestamptz not null default now()
    )
  `;
}

export async function listChallengeSchemas(): Promise<SchemaListItem[]> {
  await ensureQuestionsTable();
  await ensureSchemaMetadataTable();

  const rows = await sql<
    {
      schema_name: string;
      created_at: Date;
      table_count: string;
      question_count: string;
    }[]
  >`
    select
      m.schema_name,
      m.created_at,
      coalesce(t.table_count, 0)::text as table_count,
      coalesce(q.question_count, 0)::text as question_count
    from schema_metadata.schemas m
    left join (
      select table_schema, count(*)::int as table_count
      from information_schema.tables
      where table_type = 'BASE TABLE'
      group by table_schema
    ) t on t.table_schema = m.schema_name
    left join (
      select schema_name, count(*)::int as question_count
      from public.sql_challenge_questions
      group by schema_name
    ) q on q.schema_name = m.schema_name
    order by m.created_at desc
  `;

  return rows.map((r) => ({
    schemaName: r.schema_name,
    tableCount: Number(r.table_count),
    questionCount: Number(r.question_count),
    generatedAt: new Date(r.created_at).toISOString(),
  }));
}

export async function registerSchemaMetadata(
  schemaName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executor: any = sql,
) {
  await executor`
    insert into schema_metadata.schemas (schema_name)
    values (${schemaName})
    on conflict (schema_name) do nothing
  `;
}
