import sql from "@/lib/db";
import { isValidIdent } from "@/lib/schema/types";

export type SchemaColumn = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
};

export type SchemaForeignKey = {
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
};

export type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
};

export type SchemaSnapshot = {
  schemaName: string;
  tables: SchemaTable[];
  foreignKeys: SchemaForeignKey[];
};

export async function schemaExists(schemaName: string): Promise<boolean> {
  if (!isValidIdent(schemaName)) return false;
  const rows = await sql`
    select 1
    from information_schema.schemata
    where schema_name = ${schemaName}
    limit 1
  `;
  return rows.length > 0;
}

export async function inspectSchema(schemaName: string): Promise<SchemaSnapshot> {
  if (!isValidIdent(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }

  const exists = await schemaExists(schemaName);
  if (!exists) {
    throw new Error(`Schema "${schemaName}" does not exist`);
  }

  const tableRows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = ${schemaName}
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  if (tableRows.length === 0) {
    throw new Error(`Schema "${schemaName}" has no tables`);
  }

  const pkRows = await sql<
    { table_name: string; column_name: string }[]
  >`
    select
      tc.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.table_schema = ${schemaName}
      and tc.constraint_type = 'PRIMARY KEY'
  `;

  const pkSet = new Set(
    pkRows.map((r) => `${r.table_name}.${r.column_name}`),
  );

  const fkDetailRows = await sql<
    {
      constraint_name: string;
      from_table: string;
      from_column: string;
      to_table: string;
      to_column: string;
      ordinal_position: number;
    }[]
  >`
    select
      tc.constraint_name,
      kcu.table_name as from_table,
      kcu.column_name as from_column,
      ccu.table_name as to_table,
      ccu.column_name as to_column,
      kcu.ordinal_position
    from information_schema.table_constraints as tc
    join information_schema.key_column_usage as kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.referential_constraints as rc
      on tc.constraint_name = rc.constraint_name
     and tc.table_schema = rc.constraint_schema
    join information_schema.key_column_usage as ccu
      on rc.unique_constraint_name = ccu.constraint_name
     and rc.unique_constraint_schema = ccu.table_schema
     and kcu.ordinal_position = ccu.ordinal_position
    where tc.table_schema = ${schemaName}
      and tc.constraint_type = 'FOREIGN KEY'
    order by tc.constraint_name, kcu.ordinal_position
  `;

  const fkByConstraint = new Map<
    string,
    {
      fromTable: string;
      toTable: string;
      fromColumns: string[];
      toColumns: string[];
    }
  >();

  for (const row of fkDetailRows) {
    const existing = fkByConstraint.get(row.constraint_name);
    if (existing) {
      if (!existing.fromColumns.includes(row.from_column)) {
        existing.fromColumns.push(row.from_column);
      }
      if (!existing.toColumns.includes(row.to_column)) {
        existing.toColumns.push(row.to_column);
      }
    } else {
      fkByConstraint.set(row.constraint_name, {
        fromTable: row.from_table,
        toTable: row.to_table,
        fromColumns: [row.from_column],
        toColumns: [row.to_column],
      });
    }
  }

  const foreignKeys: SchemaForeignKey[] = [...fkByConstraint.values()];
  const fkColumnSet = new Set(
    foreignKeys.flatMap((fk) =>
      fk.fromColumns.map((col) => `${fk.fromTable}.${col}`),
    ),
  );

  const tables: SchemaTable[] = [];

  for (const { table_name } of tableRows) {
    const columns = await sql<
      { column_name: string; data_type: string; is_nullable: string }[]
    >`
      select column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = ${schemaName}
        and table_name = ${table_name}
      order by ordinal_position
    `;

    const sampleRows = await sql`
      select * from ${sql(schemaName)}.${sql(table_name)} limit 50
    `;

    const [{ count }] = await sql<{ count: string }[]>`
      select count(*)::text as count
      from ${sql(schemaName)}.${sql(table_name)}
    `;

    tables.push({
      name: table_name,
      columns: columns.map((c) => ({
        name: c.column_name,
        dataType: c.data_type,
        isNullable: c.is_nullable === "YES",
        isPrimaryKey: pkSet.has(`${table_name}.${c.column_name}`),
        isForeignKey: fkColumnSet.has(`${table_name}.${c.column_name}`),
      })),
      sampleRows: sampleRows as Record<string, unknown>[],
      rowCount: Number(count),
    });
  }

  return { schemaName, tables, foreignKeys };
}
