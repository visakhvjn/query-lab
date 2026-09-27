"use client";

import { useMemo } from "react";

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

  if (usable.length === 0) {
    return (
      <div className="border border-dashed border-teal-100/20 px-5 py-10 text-sm text-teal-100/60">
        No table data yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {usable.map((table) => {
        const dataRows = table.sampleRows ?? [];
        const columns = table.columns;
        const count = table.rows ?? dataRows.length;

        return (
          <div
            key={table.name}
            className="border border-teal-100/10 bg-white/[0.03]"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-teal-100/10 px-3 py-2">
              <span className="font-mono text-sm font-medium text-teal-50">
                {table.name}
              </span>
              <span className="font-mono text-[10px] text-teal-100/50">
                {count} rows
              </span>
            </div>

            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-max border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-mono-bg">
                  <tr className="border-b border-teal-100/10 bg-white/[0.05]">
                    {columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-3 py-2 font-mono text-[11px] font-medium text-teal-50"
                      >
                        <span>
                          {col.isPrimaryKey ? (
                            <span className="mr-1 text-teal-300">PK</span>
                          ) : col.isForeignKey ? (
                            <span className="mr-1 text-amber-300">FK</span>
                          ) : null}
                          {col.name}
                        </span>
                        <span className="mt-0.5 block font-normal text-teal-100/45">
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
                        className="px-3 py-8 text-center font-mono text-xs text-teal-100/50"
                      >
                        Empty table
                      </td>
                    </tr>
                  ) : (
                    dataRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-teal-100/[0.07] last:border-b-0 hover:bg-white/[0.03]"
                      >
                        {columns.map((col) => {
                          const raw = row[col.name];
                          const isNull = raw === null || raw === undefined;
                          return (
                            <td
                              key={col.name}
                              className={`px-3 py-2 align-top font-mono text-[12px] ${
                                isNull ? "italic text-teal-100/35" : "text-teal-50/90"
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
          </div>
        );
      })}
    </div>
  );
}
