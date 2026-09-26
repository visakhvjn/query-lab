"use client";

import { useEffect, useMemo, useState } from "react";

type Column = {
  name: string;
  dataType: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
};

type TableData = {
  name: string;
  rows?: number;
  columns: Column[];
  sampleRows?: Record<string, unknown>[];
};

type Props = {
  tables: TableData[];
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function TableDataView({ tables }: Props) {
  const usable = useMemo(
    () => tables.filter((t) => t.columns?.length),
    [tables],
  );
  const [activeName, setActiveName] = useState<string | null>(null);

  useEffect(() => {
    if (!usable.length) {
      setActiveName(null);
      return;
    }
    if (!activeName || !usable.some((t) => t.name === activeName)) {
      setActiveName(usable[0].name);
    }
  }, [usable, activeName]);

  const active =
    usable.find((t) => t.name === activeName) ?? usable[0] ?? null;

  if (usable.length === 0) {
    return (
      <div className="border border-dashed border-line bg-white/40 px-5 py-10 text-sm text-ink-soft">
        No table data yet.
      </div>
    );
  }

  const dataRows = active?.sampleRows ?? [];
  const columns = active?.columns ?? [];

  return (
    <div className="border border-line/80 bg-white/60 backdrop-blur-sm">
      <div className="flex gap-1 overflow-x-auto border-b border-line/70 p-2">
        {usable.map((table) => {
          const selected = table.name === active?.name;
          const count = table.rows ?? table.sampleRows?.length ?? 0;
          return (
            <button
              key={table.name}
              type="button"
              onClick={() => setActiveName(table.name)}
              className={`shrink-0 px-3 py-1.5 font-mono text-xs transition ${
                selected
                  ? "bg-ink text-paper"
                  : "bg-transparent text-ink-soft hover:bg-white/70 hover:text-ink"
              }`}
            >
              {table.name}
              <span className="ml-2 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left">
            <thead>
              <tr className="border-b border-line/80 bg-ink/[0.03]">
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-3 py-2 font-mono text-[11px] font-medium text-ink"
                  >
                    <span>
                      {col.isPrimaryKey ? (
                        <span className="mr-1 text-accent">PK</span>
                      ) : col.isForeignKey ? (
                        <span className="mr-1 text-signal">FK</span>
                      ) : null}
                      {col.name}
                    </span>
                    <span className="mt-0.5 block font-normal text-ink-soft">
                      {col.dataType}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-3 py-8 text-center font-mono text-xs text-ink-soft"
                  >
                    Empty table
                  </td>
                </tr>
              ) : (
                dataRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-line/50 last:border-b-0"
                  >
                    {columns.map((col) => {
                      const raw = row[col.name];
                      const isNull = raw === null || raw === undefined;
                      return (
                        <td
                          key={col.name}
                          className={`px-3 py-2 align-top font-mono text-[12px] ${
                            isNull ? "italic text-ink-soft/70" : "text-ink"
                          }`}
                        >
                          {formatCell(raw)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
