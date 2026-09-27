"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ErDiagram, type ErForeignKey, type ErTable } from "@/components/er-diagram";
import { Landing } from "@/components/landing";
import { TableDataView } from "@/components/table-data-view";
import {
  loadSolvedQuestions,
  markQuestionSolved,
} from "@/lib/progress";

type SchemaListItem = {
  schemaName: string;
  tableCount: number;
  questionCount: number;
  generatedAt: string;
};

type Question = {
  id: number;
  schemaName: string;
  questionNumber: number;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  solutionSql: string;
};

type ErTableWithData = ErTable & {
  sampleRows?: Record<string, unknown>[];
};

type ActiveSchema = {
  schemaName: string;
  description?: string;
  tables: ErTableWithData[];
  foreignKeys: ErForeignKey[];
  questions: Question[];
};

type CheckOutcome = {
  correct: boolean;
  reason: string | null;
  error?: string;
  result?: {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  };
};

export function ChallengeApp() {
  const [schemas, setSchemas] = useState<SchemaListItem[]>([]);
  const [active, setActive] = useState<ActiveSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<number | null>(1);
  const [showSolution, setShowSolution] = useState<Record<number, boolean>>({});
  const [sqlDrafts, setSqlDrafts] = useState<Record<number, string>>({});
  const [checkResults, setCheckResults] = useState<
    Record<number, CheckOutcome>
  >({});
  const [checkingQuestion, setCheckingQuestion] = useState<number | null>(null);
  const [showErDiagram, setShowErDiagram] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState<string | null>(null);
  const [solvedQuestions, setSolvedQuestions] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();

  const busy = pending || Boolean(loadingSchema);

  async function refreshList() {
    const res = await fetch("/api/schemas");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to list schemas");
    setSchemas(data.schemas);
  }

  async function loadSchema(schemaName: string, description?: string) {
    const res = await fetch(`/api/schemas/${encodeURIComponent(schemaName)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to load schema");
    setActive({
      schemaName: data.schemaName,
      description: description ?? data.description,
      tables: data.tables,
      foreignKeys: data.foreignKeys ?? [],
      questions: data.questions ?? [],
    });
    setOpenQuestion(data.questions?.[0]?.questionNumber ?? null);
    setShowSolution({});
    setSqlDrafts({});
    setCheckResults({});
    setSolvedQuestions(loadSolvedQuestions(data.schemaName));
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await refreshList();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    });
  }, []);

  useEffect(() => {
    if (!showErDiagram) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowErDiagram(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showErDiagram]);

  async function runCheck(questionNumber: number) {
    if (!active) return;
    const sqlText = sqlDrafts[questionNumber] ?? "";
    setCheckingQuestion(questionNumber);
    try {
      const res = await fetch(
        `/api/schemas/${encodeURIComponent(active.schemaName)}/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionNumber, sql: sqlText }),
        },
      );
      const data = await res.json();
      if (!data.ok) {
        setCheckResults((prev) => ({
          ...prev,
          [questionNumber]: {
            correct: false,
            reason: null,
            error: data.error || "Check failed",
          },
        }));
        return;
      }
      setCheckResults((prev) => ({
        ...prev,
        [questionNumber]: {
          correct: Boolean(data.correct),
          reason: data.reason ?? null,
          result: data.result,
        },
      }));
      if (data.correct) {
        setSolvedQuestions(
          markQuestionSolved(active.schemaName, questionNumber),
        );
      }
    } catch (e) {
      setCheckResults((prev) => ({
        ...prev,
        [questionNumber]: {
          correct: false,
          reason: null,
          error: e instanceof Error ? e.message : "Check failed",
        },
      }));
    } finally {
      setCheckingQuestion(null);
    }
  }

  const difficultyTone = useMemo(
    () => ({
      easy: "bg-teal-100 text-teal-900",
      medium: "bg-amber-100 text-amber-950",
      hard: "bg-rose-100 text-rose-900",
    }),
    [],
  );

  const diagramTables = useMemo(
    () =>
      (active?.tables ?? []).filter(
        (t): t is ErTableWithData =>
          Array.isArray(t.columns) && t.columns.length > 0,
      ),
    [active?.tables],
  );

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="anim-rise flex items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          onClick={() => {
            setActive(null);
            setShowErDiagram(false);
            setError(null);
          }}
          className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink transition hover:text-accent-deep md:text-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          <span>Query Lab</span>
        </Link>
      </header>

      {!active ? (
        <Landing
          busy={busy}
          error={error}
          schemas={schemas}
          onOpenSchema={(schemaName) => {
            setError(null);
            setLoadingSchema(schemaName);
            void (async () => {
              try {
                await loadSchema(schemaName);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
              } finally {
                setLoadingSchema(null);
              }
            })();
          }}
        />
      ) : (
        <main className="flex w-full flex-1 flex-col gap-8 px-6 pb-20 pt-2 md:px-10">
          <div className="anim-rise min-w-0">
            <h2 className="break-all font-mono text-2xl font-medium text-ink md:text-3xl">
              {active.schemaName}
            </h2>
            {active.description ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {active.description}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-start">
          <section className="anim-rise min-w-0 border border-mono-bg bg-mono-bg p-4 md:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-teal-100/70">
                Table data
              </h3>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-teal-100/60">
                  {diagramTables.length} tables · {active.foreignKeys.length}{" "}
                  links
                </span>
                <button
                  type="button"
                  onClick={() => setShowErDiagram(true)}
                  className="text-xs font-medium text-teal-300 underline underline-offset-4 transition hover:text-teal-100"
                >
                  View ER diagram
                </button>
              </div>
            </div>
            <TableDataView tables={diagramTables} />
          </section>

          <section className="anim-rise-delay-1 min-w-0">
            <div className="mb-5">
              <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
                Questions
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {active.questions.length
                  ? "Click a question box, write your SQL query, then run & check to test your knowledge."
                  : "No questions are available for this schema yet."}
              </p>
            </div>

            {active.questions.length === 0 ? (
              <div className="border border-dashed border-line bg-white/40 px-5 py-10 text-sm text-ink-soft">
                No questions are available for this schema yet.
              </div>
            ) : (
              <ol className="space-y-3">
                {active.questions.map((q, index) => {
                  const open = openQuestion === q.questionNumber;
                  const solved = solvedQuestions.includes(q.questionNumber);
                  return (
                    <li
                      key={q.id}
                      className={`anim-tick border backdrop-blur-sm ${
                        solved
                          ? "border-accent/50 bg-teal-50/80"
                          : "border-line/80 bg-white/65"
                      }`}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenQuestion(open ? null : q.questionNumber)
                        }
                        className="flex w-full items-start gap-4 px-4 py-4 text-left"
                      >
                        <span className="font-mono text-sm text-ink-soft">
                          {String(q.questionNumber).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${difficultyTone[q.difficulty]}`}
                            >
                              {q.difficulty}
                            </span>
                            {solved ? (
                              <span className="bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white">
                                Completed
                              </span>
                            ) : null}
                            {q.topics.slice(0, 2).map((topic) => (
                              <span
                                key={topic}
                                className="font-mono text-[10px] text-ink-soft"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-ink md:text-[15px]">
                            {q.prompt}
                          </p>
                        </div>
                      </button>

                      {open ? (
                        <div className="space-y-4 border-t border-line/70 px-4 py-4">
                          <div>
                            <label
                              htmlFor={`sql-${q.questionNumber}`}
                              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft"
                            >
                              Your SQL
                            </label>
                            <textarea
                              id={`sql-${q.questionNumber}`}
                              value={sqlDrafts[q.questionNumber] ?? ""}
                              onChange={(e) =>
                                setSqlDrafts((prev) => ({
                                  ...prev,
                                  [q.questionNumber]: e.target.value,
                                }))
                              }
                              spellCheck={false}
                              rows={6}
                              placeholder={`SELECT … FROM ${active.schemaName}.…`}
                              className="mt-2 w-full resize-y border border-line/80 bg-mono-bg p-3 font-mono text-xs leading-relaxed text-teal-100 outline-none placeholder:text-teal-100/35 focus:border-accent"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              disabled={
                                checkingQuestion === q.questionNumber ||
                                !(sqlDrafts[q.questionNumber] ?? "").trim()
                              }
                              onClick={() => runCheck(q.questionNumber)}
                              className="inline-flex h-10 items-center justify-center bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {checkingQuestion === q.questionNumber
                                ? "Running…"
                                : "Run & check"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setShowSolution((prev) => ({
                                  ...prev,
                                  [q.questionNumber]: !prev[q.questionNumber],
                                }))
                              }
                              className="font-mono text-xs text-accent underline-offset-4 hover:underline"
                            >
                              {showSolution[q.questionNumber]
                                ? "Hide solution"
                                : "Reveal solution"}
                            </button>
                          </div>

                          {checkResults[q.questionNumber] ? (
                            <div
                              className={`border px-3 py-3 ${
                                checkResults[q.questionNumber].error
                                  ? "border-danger/40 bg-rose-50"
                                  : checkResults[q.questionNumber].correct
                                    ? "border-accent/40 bg-teal-50"
                                    : "border-signal/50 bg-amber-50"
                              }`}
                            >
                              <p className="font-mono text-xs font-medium text-ink">
                                {checkResults[q.questionNumber].error
                                  ? "Error"
                                  : checkResults[q.questionNumber].correct
                                    ? "Correct"
                                    : "Incorrect"}
                              </p>
                              <p className="mt-1 text-sm text-ink-soft">
                                {checkResults[q.questionNumber].error ||
                                  checkResults[q.questionNumber].reason ||
                                  (checkResults[q.questionNumber].correct
                                    ? "Your result matches the expected answer."
                                    : "Try again.")}
                              </p>
                              {checkResults[q.questionNumber].result &&
                              checkResults[q.questionNumber].result!.rows
                                .length > 0 ? (
                                <div className="mt-3 overflow-x-auto border border-line/60 bg-white/70">
                                  <table className="w-full min-w-max border-collapse text-left">
                                    <thead>
                                      <tr className="border-b border-line/70">
                                        {checkResults[
                                          q.questionNumber
                                        ].result!.columns.map((col) => (
                                          <th
                                            key={col}
                                            className="px-2 py-1.5 font-mono text-[10px] text-ink-soft"
                                          >
                                            {col}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {checkResults[
                                        q.questionNumber
                                      ].result!.rows.map((row, i) => (
                                        <tr
                                          key={i}
                                          className="border-b border-line/40 last:border-0"
                                        >
                                          {checkResults[
                                            q.questionNumber
                                          ].result!.columns.map((col) => (
                                            <td
                                              key={col}
                                              className="px-2 py-1.5 font-mono text-[11px] text-ink"
                                            >
                                              {row[col] === null ||
                                              row[col] === undefined
                                                ? "NULL"
                                                : String(row[col])}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <p className="border-t border-line/50 px-2 py-1 font-mono text-[10px] text-ink-soft">
                                    {
                                      checkResults[q.questionNumber].result!
                                        .rowCount
                                    }{" "}
                                    row(s)
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {showSolution[q.questionNumber] ? (
                            <pre className="overflow-x-auto bg-mono-bg p-4 font-mono text-xs leading-relaxed text-teal-100">
                              {q.solutionSql}
                            </pre>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          </div>
        </main>
      )}

      {showErDiagram && active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="er-diagram-title"
          onClick={() => setShowErDiagram(false)}
        >
          <div
            className="anim-rise flex max-h-[75vh] w-full max-w-xl flex-col border border-line border-t-4 border-t-accent bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line/80 px-4 py-3">
              <div className="min-w-0">
                <h2
                  id="er-diagram-title"
                  className="font-mono text-sm font-medium text-ink"
                >
                  ER diagram · {active.schemaName}
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-soft">
                  An ER (Entity-Relationship) diagram maps how tables connect.
                  Boxes are tables; arrows are foreign keys that link a column
                  in one table to a primary key in another—handy before you
                  write JOINs.
                </p>
                <p className="mt-2 font-mono text-[10px] text-ink-soft">
                  {diagramTables.length} tables · {active.foreignKeys.length}{" "}
                  links · PK primary · FK foreign
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowErDiagram(false)}
                className="shrink-0 font-mono text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <ErDiagram
                tables={diagramTables}
                foreignKeys={active.foreignKeys}
              />
            </div>
          </div>
        </div>
      ) : null}

      {loadingSchema ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-6 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="anim-rise flex w-full max-w-sm flex-col items-center gap-4 border border-line border-t-4 border-t-accent bg-paper px-8 py-10 text-center">
            <div
              className="anim-spin h-9 w-9 rounded-full border-2 border-line border-t-accent"
              aria-hidden="true"
            />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                Opening challenge
              </p>
              <p className="mt-2 break-all font-mono text-sm text-ink">
                {loadingSchema}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Loading tables and questions…
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
