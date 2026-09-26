import sql from "@/lib/db";
import type { GeneratedSchema, TableDef } from "@/lib/schema/types";
import { isAllowedType, isValidIdent } from "@/lib/schema/types";
import {
  ensureSchemaMetadataTable,
  registerSchemaMetadata,
} from "@/lib/schema/list";

function quoteIdent(name: string): string {
  if (!isValidIdent(name)) {
    throw new Error(`Refusing unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

function columnSql(col: TableDef["columns"][number]): string {
  if (!isAllowedType(col.type)) {
    throw new Error(`Refusing unsafe type: ${col.type}`);
  }
  const parts = [quoteIdent(col.name), col.type];
  if (col.primaryKey) parts.push("PRIMARY KEY");
  if (!col.nullable && !col.primaryKey) parts.push("NOT NULL");
  return parts.join(" ");
}

export function sortTablesForCreation(tables: TableDef[]): TableDef[] {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: TableDef[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular foreign keys involving ${name}`);
    }
    visiting.add(name);
    const table = byName.get(name);
    if (!table) throw new Error(`Unknown table ${name}`);
    for (const fk of table.foreignKeys) {
      visit(fk.referencesTable);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(table);
  }

  for (const table of tables) visit(table.name);
  return ordered;
}

export function buildCreateStatements(schema: GeneratedSchema): string[] {
  const schemaIdent = quoteIdent(schema.schemaName);
  const statements: string[] = [`CREATE SCHEMA ${schemaIdent}`];

  for (const table of sortTablesForCreation(schema.tables)) {
    const cols = table.columns.map(columnSql);
    const fks = table.foreignKeys.map((fk) => {
      const colsList = fk.columns.map(quoteIdent).join(", ");
      const refCols = fk.referencesColumns.map(quoteIdent).join(", ");
      return `FOREIGN KEY (${colsList}) REFERENCES ${schemaIdent}.${quoteIdent(fk.referencesTable)} (${refCols})`;
    });

    statements.push(
      `CREATE TABLE ${schemaIdent}.${quoteIdent(table.name)} (${[...cols, ...fks].join(", ")})`,
    );
  }

  return statements;
}

async function seedTables(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  schema: GeneratedSchema,
): Promise<Record<string, number>> {
  const rowCounts: Record<string, number> = {};

  for (const table of sortTablesForCreation(schema.tables)) {
    if (table.rows.length === 0) {
      rowCounts[table.name] = 0;
      continue;
    }

    const columnNames = table.columns.map((c) => c.name);
    await tx`
      INSERT INTO ${tx(schema.schemaName)}.${tx(table.name)} ${tx(table.rows, columnNames)}
    `;

    // Keep serial sequences in sync when explicit IDs were inserted.
    for (const column of table.columns) {
      if (
        column.primaryKey &&
        (column.type === "serial" || column.type === "bigserial")
      ) {
        const seqTable = `${quoteIdent(schema.schemaName)}.${quoteIdent(table.name)}`;
        const seqCol = quoteIdent(column.name);
        await tx.unsafe(
          `SELECT setval(pg_get_serial_sequence('${schema.schemaName}.${table.name}', '${column.name}'), COALESCE((SELECT MAX(${seqCol}) FROM ${seqTable}), 1))`,
        );
      }
    }

    rowCounts[table.name] = table.rows.length;
  }

  return rowCounts;
}

export async function materializeSchema(schema: GeneratedSchema) {
  await ensureSchemaMetadataTable();

  let schemaName = schema.schemaName;
  const existing = await sql`
    select 1
    from information_schema.schemata
    where schema_name = ${schemaName}
    limit 1
  `;
  if (existing.length > 0) {
    const suffix = `_${Date.now().toString(36).slice(-4)}`;
    schemaName = `${schema.schemaName.slice(0, 63 - suffix.length)}${suffix}`;
  }

  const finalSchema: GeneratedSchema = { ...schema, schemaName };
  const statements = buildCreateStatements(finalSchema);

  let rowCounts: Record<string, number> = {};

  await sql.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
    rowCounts = await seedTables(tx, finalSchema);
    await registerSchemaMetadata(schemaName, tx);
  });

  return { schema: finalSchema, statements, rowCounts };
}
