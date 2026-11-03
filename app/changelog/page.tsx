import type { Metadata } from "next";
import Link from "next/link";
import { getChangelog } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog — Query Lab",
  description: "What changed in each version of Query Lab.",
};

function formatReleaseDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function ChangelogPage() {
  const entries = await getChangelog();

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="anim-rise flex items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
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
        <Link
          href="/"
          className="font-mono text-xs text-ink-soft underline-offset-4 transition hover:text-ink hover:underline"
        >
          Back to challenges
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20 pt-8 md:px-10 md:pt-12">
        <div className="anim-rise">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
            Changelog
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            What’s new in Query Lab
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
            Every release, newest first.
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="mt-12 font-mono text-sm text-ink-soft">
            No releases yet.
          </p>
        ) : (
          <ol className="anim-rise-delay-1 mt-12 border-l border-line/80">
            {entries.map((entry, index) => (
              <li
                key={entry.version}
                id={`v${entry.version}`}
                className="relative pb-12 pl-8 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-[5px] top-2 h-2.5 w-2.5 ${
                    index === 0 ? "bg-accent" : "border border-line bg-paper"
                  }`}
                />
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="font-mono text-2xl font-medium text-ink">
                    v{entry.version}
                  </h2>
                  <time
                    dateTime={entry.date}
                    className="font-mono text-xs text-ink-soft"
                  >
                    {formatReleaseDate(entry.date)}
                  </time>
                  {index === 0 ? (
                    <span className="bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white">
                      Current
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 space-y-5 border border-line/70 bg-white/45 p-5 md:p-6">
                  {entry.sections.map((section) => (
                    <section key={section.title}>
                      <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                        {section.title}
                      </h3>
                      <ul className="mt-2.5 space-y-2">
                        {section.items.map((item) => (
                          <li
                            key={item}
                            className="flex gap-3 text-sm leading-relaxed text-ink md:text-base"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-[0.6em] h-1 w-1 shrink-0 bg-ink-soft"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
