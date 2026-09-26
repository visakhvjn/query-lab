import sql from "@/lib/db";
import { isValidIdent } from "@/lib/schema/types";
import { assertReadonlySelect } from "@/lib/sql/validate";

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
};

function serializeCell(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  return String(value);
}

function normalizeRow(row: Record<string, unknown>): string {
  const keys = Object.keys(row).sort();
  const normalized: Record<string, string> = {};
  for (const key of keys) {
    normalized[key.toLowerCase()] = serializeCell(row[key]);
  }
  return JSON.stringify(normalized);
}

function compareResults(
  expected: QueryResult,
  actual: QueryResult,
  orderMatters: boolean,
): { correct: boolean; reason?: string } {
  if (expected.rowCount !== actual.rowCount) {
    return {
      correct: false,
      reason: `Expected ${expected.rowCount} row(s), got ${actual.rowCount}`,
    };
  }

  const expectedNorm = expected.rows.map(normalizeRow);
  const actualNorm = actual.rows.map(normalizeRow);

  if (!orderMatters) {
    expectedNorm.sort();
    actualNorm.sort();
  }

  for (let i = 0; i < expectedNorm.length; i++) {
    if (expectedNorm[i] !== actualNorm[i]) {
      return {
        correct: false,
        reason: orderMatters
          ? `Row ${i + 1} does not match the expected result`
          : "Result rows do not match the expected set",
      };
    }
  }

  return { correct: true };
}

async function runSelect(
  schemaName: string,
  query: string,
): Promise<QueryResult> {
  const safe = assertReadonlySelect(query);

  const result = await sql.begin(async (tx) => {
    await tx`select set_config('search_path', ${`${schemaName}, public`}, true)`;
    await tx`select set_config('statement_timeout', '4000', true)`;
    return tx.unsafe(safe);
  });

  const rows = [...(result as unknown as Record<string, unknown>[])];
  const metaColumns = (result as { columns?: { name: string }[] }).columns?.map(
    (c) => c.name,
  );
  const columns =
    metaColumns && metaColumns.length > 0
      ? metaColumns
      : rows.length > 0
        ? Object.keys(rows[0])
        : [];

  return {
    columns,
    rows: rows.slice(0, 50),
    rowCount: rows.length,
  };
}

export async function checkUserQuery(options: {
  schemaName: string;
  solutionSql: string;
  userSql: string;
}): Promise<{
  correct: boolean;
  reason?: string;
  userResult: QueryResult;
  orderMatters: boolean;
}> {
  const { schemaName, solutionSql, userSql } = options;

  if (!isValidIdent(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }

  const orderMatters = /\border\s+by\b/i.test(solutionSql);

  let userResult: QueryResult;
  let expected: QueryResult;

  try {
    userResult = await runSelect(schemaName, userSql);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    throw new Error(`Your query failed: ${message}`);
  }

  try {
    expected = await runSelect(schemaName, solutionSql);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    throw new Error(`Reference solution failed: ${message}`);
  }

  const comparison = compareResults(expected, userResult, orderMatters);
  return {
    correct: comparison.correct,
    reason: comparison.reason,
    userResult,
    orderMatters,
  };
}
