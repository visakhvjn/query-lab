export type ColumnDef = {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
};

export type ForeignKeyDef = {
  columns: string[];
  referencesTable: string;
  referencesColumns: string[];
};

export type RowValue = string | number | boolean | null;

export type TableDef = {
  name: string;
  columns: ColumnDef[];
  foreignKeys: ForeignKeyDef[];
  rows: Record<string, RowValue>[];
};

export type GeneratedSchema = {
  schemaName: string;
  description: string;
  tables: TableDef[];
};

const IDENT_RE = /^[a-z][a-z0-9_]{0,62}$/;

const ALLOWED_TYPES = new Set([
  "integer",
  "bigint",
  "smallint",
  "serial",
  "bigserial",
  "boolean",
  "text",
  "uuid",
  "date",
  "timestamptz",
  "numeric",
  "real",
  "double precision",
]);

const VARCHAR_RE = /^varchar\(([1-9][0-9]{0,3})\)$/;
const NUMERIC_RE = /^numeric\(([1-9][0-9]?),([0-9]|[1-3][0-9])\)$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidIdent(name: string): boolean {
  return IDENT_RE.test(name);
}

export function isAllowedType(type: string): boolean {
  const normalized = type.trim().toLowerCase();
  if (ALLOWED_TYPES.has(normalized)) return true;
  if (VARCHAR_RE.test(normalized)) return true;
  if (NUMERIC_RE.test(normalized)) return true;
  return false;
}

function isIntegerType(type: string): boolean {
  return ["integer", "bigint", "smallint", "serial", "bigserial"].includes(type);
}

function isNumericType(type: string): boolean {
  return (
    type === "numeric" ||
    type === "real" ||
    type === "double precision" ||
    NUMERIC_RE.test(type)
  );
}

function coerceRowValue(
  tableName: string,
  column: ColumnDef,
  raw: unknown,
): RowValue {
  if (raw === null) {
    if (!column.nullable && !column.primaryKey) {
      throw new Error(`Null not allowed for ${tableName}.${column.name}`);
    }
    return null;
  }

  const type = column.type;

  if (type === "boolean") {
    if (typeof raw !== "boolean") {
      throw new Error(`Expected boolean for ${tableName}.${column.name}`);
    }
    return raw;
  }

  if (isIntegerType(type)) {
    if (typeof raw !== "number" || !Number.isInteger(raw)) {
      throw new Error(`Expected integer for ${tableName}.${column.name}`);
    }
    return raw;
  }

  if (isNumericType(type)) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new Error(`Expected number for ${tableName}.${column.name}`);
    }
    return raw;
  }

  if (typeof raw !== "string") {
    throw new Error(`Expected string for ${tableName}.${column.name}`);
  }

  if (type === "uuid" && !UUID_RE.test(raw)) {
    throw new Error(`Invalid uuid for ${tableName}.${column.name}`);
  }

  if (type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Invalid date for ${tableName}.${column.name}`);
  }

  if (type === "timestamptz") {
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) {
      throw new Error(`Invalid timestamptz for ${tableName}.${column.name}`);
    }
  }

  const varcharMatch = type.match(VARCHAR_RE);
  if (varcharMatch && raw.length > Number(varcharMatch[1])) {
    throw new Error(`Value too long for ${tableName}.${column.name}`);
  }

  return raw;
}

export function assertGeneratedSchema(value: unknown): GeneratedSchema {
  if (!value || typeof value !== "object") {
    throw new Error("AI returned invalid schema payload");
  }

  const raw = value as Record<string, unknown>;
  const schemaName = String(raw.schemaName ?? "").trim();
  const description = String(raw.description ?? "").trim();
  const tables = raw.tables;

  if (!isValidIdent(schemaName)) {
    throw new Error(`Invalid schema name from AI: ${schemaName}`);
  }
  if (!Array.isArray(tables) || tables.length < 2) {
    throw new Error("AI must return at least 2 related tables");
  }

  const parsedTables: TableDef[] = tables.map((table, index) => {
    if (!table || typeof table !== "object") {
      throw new Error(`Invalid table at index ${index}`);
    }
    const t = table as Record<string, unknown>;
    const name = String(t.name ?? "").trim();
    if (!isValidIdent(name)) {
      throw new Error(`Invalid table name: ${name}`);
    }

    if (!Array.isArray(t.columns) || t.columns.length === 0) {
      throw new Error(`Table ${name} has no columns`);
    }

    const columns: ColumnDef[] = t.columns.map((col) => {
      if (!col || typeof col !== "object") {
        throw new Error(`Invalid column in table ${name}`);
      }
      const c = col as Record<string, unknown>;
      const colName = String(c.name ?? "").trim();
      const type = String(c.type ?? "").trim().toLowerCase();
      if (!isValidIdent(colName)) {
        throw new Error(`Invalid column name: ${colName}`);
      }
      if (!isAllowedType(type)) {
        throw new Error(`Disallowed column type "${type}" on ${name}.${colName}`);
      }
      return {
        name: colName,
        type,
        nullable: Boolean(c.nullable),
        primaryKey: Boolean(c.primaryKey),
      };
    });

    const pkCount = columns.filter((c) => c.primaryKey).length;
    if (pkCount !== 1) {
      throw new Error(`Table ${name} must have exactly one primary key column`);
    }

    const foreignKeys: ForeignKeyDef[] = Array.isArray(t.foreignKeys)
      ? t.foreignKeys.map((fk) => {
          if (!fk || typeof fk !== "object") {
            throw new Error(`Invalid foreign key in table ${name}`);
          }
          const f = fk as Record<string, unknown>;
          const columnsList = Array.isArray(f.columns)
            ? f.columns.map((x) => String(x))
            : [];
          const referencesTable = String(f.referencesTable ?? "").trim();
          const referencesColumns = Array.isArray(f.referencesColumns)
            ? f.referencesColumns.map((x) => String(x))
            : [];

          if (!columnsList.every(isValidIdent)) {
            throw new Error(`Invalid FK columns on ${name}`);
          }
          if (!isValidIdent(referencesTable)) {
            throw new Error(`Invalid FK referenced table on ${name}`);
          }
          if (!referencesColumns.every(isValidIdent)) {
            throw new Error(`Invalid FK referenced columns on ${name}`);
          }
          if (
            columnsList.length === 0 ||
            columnsList.length !== referencesColumns.length
          ) {
            throw new Error(`FK column count mismatch on ${name}`);
          }

          return { columns: columnsList, referencesTable, referencesColumns };
        })
      : [];

    if (!Array.isArray(t.rows) || t.rows.length < 3) {
      throw new Error(`Table ${name} must include at least 3 seed rows`);
    }
    if (t.rows.length > 12) {
      throw new Error(`Table ${name} has too many seed rows (max 12)`);
    }

    const rows: Record<string, RowValue>[] = t.rows.map((row, rowIndex) => {
      // Prefer column-aligned arrays from the model; also accept objects.
      if (Array.isArray(row)) {
        if (row.length !== columns.length) {
          throw new Error(
            `Row ${rowIndex} in ${name} must have ${columns.length} values (got ${row.length})`,
          );
        }
        const normalized: Record<string, RowValue> = {};
        columns.forEach((column, i) => {
          normalized[column.name] = coerceRowValue(name, column, row[i]);
        });
        return normalized;
      }

      if (!row || typeof row !== "object") {
        throw new Error(`Invalid row ${rowIndex} in table ${name}`);
      }

      const record = row as Record<string, unknown>;
      const normalized: Record<string, RowValue> = {};
      for (const column of columns) {
        if (!(column.name in record)) {
          if (column.nullable) {
            normalized[column.name] = null;
            continue;
          }
          throw new Error(
            `Missing column "${column.name}" in ${name} row ${rowIndex}`,
          );
        }
        normalized[column.name] = coerceRowValue(
          name,
          column,
          record[column.name],
        );
      }
      return normalized;
    });

    return { name, columns, foreignKeys, rows };
  });

  const tableNames = new Set(parsedTables.map((t) => t.name));
  if (tableNames.size !== parsedTables.length) {
    throw new Error("Duplicate table names in generated schema");
  }

  for (const table of parsedTables) {
    for (const fk of table.foreignKeys) {
      if (!tableNames.has(fk.referencesTable)) {
        throw new Error(
          `FK on ${table.name} references unknown table ${fk.referencesTable}`,
        );
      }
    }
  }

  const hasRelation = parsedTables.some((t) => t.foreignKeys.length > 0);
  if (!hasRelation) {
    throw new Error("Generated tables must be related via at least one foreign key");
  }

  return { schemaName, description, tables: parsedTables };
}
