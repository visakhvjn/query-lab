"use client";

import { useMemo } from "react";

export type ErColumn = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
};

export type ErTable = {
  name: string;
  rows?: number;
  columns: ErColumn[];
};

export type ErForeignKey = {
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
};

type Props = {
  tables: ErTable[];
  foreignKeys: ErForeignKey[];
};

type NodeLayout = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  table: ErTable;
};

const COL_ROW_H = 22;
const HEADER_H = 36;
const PAD_X = 12;
const NODE_W = 220;

function shortType(dataType: string): string {
  const t = dataType.toLowerCase();
  if (t.includes("timestamp")) return "timestamptz";
  if (t.includes("character varying")) return "varchar";
  if (t === "double precision") return "float8";
  return t;
}

function layoutNodes(tables: ErTable[]): {
  nodes: NodeLayout[];
  width: number;
  height: number;
} {
  const count = Math.max(tables.length, 1);
  const radius = count === 1 ? 0 : 40 + count * 48;
  const cx = 320;
  const cy = 280;
  const nodes: NodeLayout[] = tables.map((table, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const height = HEADER_H + table.columns.length * COL_ROW_H + 10;
    const x =
      count === 1 ? cx - NODE_W / 2 : cx + Math.cos(angle) * radius - NODE_W / 2;
    const y =
      count === 1 ? cy - height / 2 : cy + Math.sin(angle) * radius - height / 2;
    return { name: table.name, x, y, width: NODE_W, height, table };
  });

  const minX = Math.min(...nodes.map((n) => n.x), 0);
  const minY = Math.min(...nodes.map((n) => n.y), 0);
  const shiftX = 24 - minX;
  const shiftY = 24 - minY;

  const shifted = nodes.map((n) => ({
    ...n,
    x: n.x + shiftX,
    y: n.y + shiftY,
  }));

  const width = Math.max(...shifted.map((n) => n.x + n.width)) + 24;
  const height = Math.max(...shifted.map((n) => n.y + n.height)) + 24;

  return { nodes: shifted, width, height };
}

function edgePoints(
  from: NodeLayout,
  to: NodeLayout,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let x1 = fromCx;
  let y1 = fromCy;
  let x2 = toCx;
  let y2 = toCy;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      x1 = from.x + from.width;
      x2 = to.x;
    } else {
      x1 = from.x;
      x2 = to.x + to.width;
    }
    y1 = fromCy;
    y2 = toCy;
  } else {
    if (dy > 0) {
      y1 = from.y + from.height;
      y2 = to.y;
    } else {
      y1 = from.y;
      y2 = to.y + to.height;
    }
    x1 = fromCx;
    x2 = toCx;
  }

  return { x1, y1, x2, y2 };
}

export function ErDiagram({ tables, foreignKeys }: Props) {
  const { nodes, width, height } = useMemo(
    () => layoutNodes(tables),
    [tables],
  );

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.name, n])),
    [nodes],
  );

  if (tables.length === 0) {
    return (
      <div className="border border-dashed border-line bg-white/40 px-5 py-10 text-sm text-ink-soft">
        No tables to diagram yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-line/80 bg-white/60 backdrop-blur-sm">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        className="min-h-[320px] min-w-[280px]"
        role="img"
        aria-label="Entity relationship diagram"
      >
        <defs>
          <marker
            id="er-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f766e" />
          </marker>
        </defs>

        {foreignKeys.map((fk, index) => {
          const from = nodeMap.get(fk.fromTable);
          const to = nodeMap.get(fk.toTable);
          if (!from || !to) return null;
          const { x1, y1, x2, y2 } = edgePoints(from, to);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const label = `${fk.fromColumns.join(",")} → ${fk.toColumns.join(",")}`;
          return (
            <g key={`${fk.fromTable}-${fk.toTable}-${index}`}>
              <path
                d={`M ${x1} ${y1} Q ${mx} ${my - 18} ${x2} ${y2}`}
                fill="none"
                stroke="#0f766e"
                strokeWidth="1.75"
                markerEnd="url(#er-arrow)"
                opacity="0.85"
              />
              <title>{label}</title>
            </g>
          );
        })}

        {nodes.map((node) => (
          <g key={node.name} transform={`translate(${node.x}, ${node.y})`}>
            <rect
              width={node.width}
              height={node.height}
              fill="#f7fafc"
              stroke="#12263a"
              strokeWidth="1.5"
            />
            <rect
              width={node.width}
              height={HEADER_H}
              fill="#12263a"
            />
            <text
              x={PAD_X}
              y={23}
              fill="#eef3f7"
              fontFamily="var(--font-mono), ui-monospace, monospace"
              fontSize="12"
              fontWeight="600"
            >
              {node.name}
            </text>
            <text
              x={node.width - PAD_X}
              y={23}
              fill="#b7c9d9"
              fontFamily="var(--font-mono), ui-monospace, monospace"
              fontSize="10"
              textAnchor="end"
            >
              {node.table.rows ?? 0} rows
            </text>

            {node.table.columns.map((col, i) => {
              const y = HEADER_H + 4 + i * COL_ROW_H;
              return (
                <g key={col.name}>
                  {i > 0 ? (
                    <line
                      x1="0"
                      x2={node.width}
                      y1={y}
                      y2={y}
                      stroke="#d7e2ea"
                      strokeWidth="1"
                    />
                  ) : null}
                  <text
                    x={PAD_X}
                    y={y + 16}
                    fill="#12263a"
                    fontFamily="var(--font-mono), ui-monospace, monospace"
                    fontSize="11"
                  >
                    {col.isPrimaryKey ? "PK " : col.isForeignKey ? "FK " : "   "}
                    {col.name}
                  </text>
                  <text
                    x={node.width - PAD_X}
                    y={y + 16}
                    fill="#3d5a73"
                    fontFamily="var(--font-mono), ui-monospace, monospace"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {shortType(col.dataType)}
                    {col.isNullable ? "?" : ""}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-4 border-t border-line/70 px-3 py-2 font-mono text-[10px] text-ink-soft">
        <span>
          <span className="text-ink">PK</span> primary key
        </span>
        <span>
          <span className="text-ink">FK</span> foreign key
        </span>
        <span className="text-accent">→</span>
        <span>relationship</span>
      </div>
    </div>
  );
}
