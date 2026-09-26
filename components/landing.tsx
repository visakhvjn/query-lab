"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type SchemaListItem = {
  schemaName: string;
  tableCount: number;
  questionCount: number;
  generatedAt: string;
};

type Props = {
  busy: boolean;
  error: string | null;
  schemas: SchemaListItem[];
  onOpenSchema: (schemaName: string) => void;
};

function formatGeneratedAt(iso: string | null | undefined): string {
  if (!iso) return "Recently";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProductVisual() {
  return (
    <div
      className="anim-rise-delay-2 relative isolate min-h-[320px] w-full overflow-hidden border border-line/70 bg-mono-bg md:min-h-[420px]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#1a4a5c_0%,transparent_55%),radial-gradient(ellipse_at_90%_80%,#0f766e33_0%,transparent_45%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(#b7c9d9_1px,transparent_1px),linear-gradient(90deg,#b7c9d9_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative flex h-full flex-col gap-4 p-5 md:p-7">
        <div className="flex items-center gap-2 font-mono text-[10px] text-teal-100/60">
          <span className="inline-block h-2 w-2 bg-accent" />
          live challenge · bookstore_ops
        </div>

        <div className="grid flex-1 gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2">
            <div className="border border-teal-100/15 bg-white/[0.04] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal-100/50">
                schema
              </p>
              <div className="mt-3 space-y-2">
                {["authors", "books", "orders"].map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between border border-teal-100/10 bg-mono-bg/80 px-2.5 py-2 font-mono text-[11px] text-teal-50"
                    style={{ animationDelay: `${0.2 + i * 0.08}s` }}
                  >
                    <span>{name}</span>
                    <span className="text-teal-100/45">{4 + i} rows</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-teal-100/15 bg-white/[0.04] p-3 font-mono text-[10px] leading-relaxed text-teal-100/55">
              PK authors.id → FK books.author_id
              <br />
              PK books.id → FK orders.book_id
            </div>
          </div>

          <div className="flex flex-col border border-teal-100/15 bg-white/[0.04]">
            <div className="border-b border-teal-100/10 px-3 py-2 font-mono text-[10px] text-teal-100/50">
              Q03 · medium · joins
            </div>
            <p className="px-3 pt-3 text-sm leading-snug text-teal-50/90">
              List each book title with its author’s last name and order count.
            </p>
            <pre className="mt-auto overflow-hidden p-3 font-mono text-[11px] leading-relaxed text-teal-100/85">
              <span className="text-accent">SELECT</span>
              {"\n  b.title, a.last_name, COUNT(*)"}
              {"\n"}
              <span className="text-accent">FROM</span>
              {" books b"}
              {"\n"}
              <span className="text-accent">JOIN</span>
              {" authors a ON …"}
              <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-signal anim-pulse-bar" />
            </pre>
            <div className="border-t border-teal-100/10 px-3 py-2 font-mono text-[10px] text-accent">
              Run & check → Correct
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Landing({
  busy,
  error,
  schemas,
  onOpenSchema,
}: Props) {
  const [stockOpen, setStockOpen] = useState(false);

  useEffect(() => {
    if (!stockOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStockOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [stockOpen]);

  function pickSchema(schemaName: string) {
    setStockOpen(false);
    onOpenSchema(schemaName);
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero: one composition */}
      <section className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 pb-16 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-12 md:px-10 md:pb-20 md:pt-10">
        <div className="anim-rise max-w-xl">
          <p className="text-5xl font-semibold tracking-tight text-ink md:text-7xl">
            Query Lab
          </p>
          <h1 className="mt-5 text-2xl font-medium leading-snug tracking-tight text-ink md:text-3xl">
            Practice SQL that feels real.
          </h1>
          <p className="anim-rise-delay-1 mt-4 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
            A practice ground for real SQL: explore a living database, write
            joins and aggregates by hand, and check your answers until they
            click.
          </p>
          <div className="anim-rise-delay-2 mt-9">
            <button
              type="button"
              onClick={() => setStockOpen(true)}
              className="inline-flex h-12 items-center justify-center bg-accent px-7 text-base font-medium text-white transition hover:bg-accent-deep"
            >
              Pick a challenge
            </button>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <ProductVisual />
      </section>

      {/* Daily challenge */}
      <section id="daily-challenge" className="border-t border-line/70 bg-white/35">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:gap-14 md:px-10 md:py-20">
          <div className="relative aspect-[16/10] w-full overflow-hidden border border-line/70">
            <Image
              src="/daily-challenge.jpg"
              alt="A desk with a laptop open to a SQL practice session"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={false}
            />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              Daily practice
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              A new challenge every day.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft md:text-lg">
              Show up, get a fresh database world, and work through ten queries
              that stretch your joins, filters, and aggregates. Tomorrow looks
              different—so your skills grow from habit, not from replaying the
              same worksheet.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Treat it like a daily gym for SQL: short sessions, real schemas,
              instant feedback when you run your answer.
            </p>
          </div>
        </div>
      </section>


      {/* Inventory */}
      <section id="inventory" className="border-t border-line/70 bg-white/35">
        <div className="mx-auto grid max-w-6xl items-stretch gap-10 px-6 py-16 md:grid-cols-2 md:gap-14 md:px-10 md:py-20">
          <div className="flex flex-col">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              Inventory
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              What’s in stock
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Fresh practice worlds waiting on the shelf. Choose a schema,
              open the tables, and keep working through the questions.
            </p>

            <div className="mt-8 flex-1 border-t border-line/80">
              {busy && schemas.length === 0 ? (
                <p className="py-6 font-mono text-sm text-ink-soft">
                  Loading stock…
                </p>
              ) : schemas.length === 0 ? (
                <p className="py-6 font-mono text-sm text-ink-soft">
                  Nothing on the shelf right now. Check back soon.
                </p>
              ) : (
                schemas.map((s) => (
                  <button
                    key={s.schemaName}
                    type="button"
                    disabled={busy}
                    onClick={() => pickSchema(s.schemaName)}
                    className="group flex w-full items-baseline justify-between gap-4 border-b border-line/80 px-2 py-3.5 text-left transition hover:bg-accent disabled:opacity-60"
                  >
                    <span className="min-w-0 truncate font-mono text-sm text-ink group-hover:text-white">
                      {s.schemaName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-soft group-hover:text-white/80">
                      {s.tableCount} tbl · {s.questionCount} q
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="relative aspect-[16/10] w-full overflow-hidden border border-line/70 md:aspect-auto md:min-h-[360px]">
            <Image
              src="/inventory-stock.jpg"
              alt="Organized shelves of database archives ready to pick"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-mono text-xs text-ink-soft">
            © {new Date().getFullYear()} Query Lab
          </p>
          <p className="font-mono text-xs text-ink-soft">
            Made by{" "}
            <a
              href="https://www.visakhvijayan.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline-offset-4 transition hover:text-accent hover:underline"
            >
              Visakh Vijayan
            </a>
          </p>
        </div>
      </footer>

      {stockOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-modal-title"
          onClick={() => setStockOpen(false)}
        >
          <div
            className="anim-rise flex max-h-[90vh] w-full max-w-3xl flex-col border border-line border-t-4 border-t-accent bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line/80 px-6 py-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Inventory
                </p>
                <h2
                  id="stock-modal-title"
                  className="mt-1 text-2xl font-semibold tracking-tight text-ink"
                >
                  What’s in stock
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStockOpen(false)}
                className="font-mono text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {busy && schemas.length === 0 ? (
                <p className="px-6 py-10 font-mono text-sm text-ink-soft">
                  Loading stock…
                </p>
              ) : schemas.length === 0 ? (
                <p className="px-6 py-10 font-mono text-sm text-ink-soft">
                  Nothing on the shelf right now. Check back soon.
                </p>
              ) : (
                schemas.map((s, index) => (
                  <button
                    key={s.schemaName}
                    type="button"
                    disabled={busy}
                    onClick={() => pickSchema(s.schemaName)}
                    className="group flex w-full items-center justify-between gap-6 border-b border-line/70 px-6 py-5 text-left transition hover:bg-accent disabled:opacity-60 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-baseline gap-4">
                      <span className="shrink-0 font-mono text-xs text-ink-soft group-hover:text-white/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-base text-ink group-hover:text-white">
                          {s.schemaName}
                        </span>
                        <span className="mt-1 block font-mono text-[11px] text-ink-soft group-hover:text-white/75">
                          Generated {formatGeneratedAt(s.generatedAt)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-[11px] text-ink-soft group-hover:text-white/80">
                      {s.tableCount} tbl · {s.questionCount} q
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
