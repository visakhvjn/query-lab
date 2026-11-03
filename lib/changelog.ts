import { readFile } from "node:fs/promises";
import path from "node:path";

export type ChangelogSection = {
  title: string;
  items: string[];
};

export type ChangelogEntry = {
  version: string;
  date: string;
  sections: ChangelogSection[];
};

const VERSION_HEADING = /^##\s+\[([^\]]+)\]\s*-\s*(\S+)\s*$/;
const SECTION_HEADING = /^###\s+(.+?)\s*$/;
const LIST_ITEM = /^[-*]\s+(.+?)\s*$/;

export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | null = null;
  let section: ChangelogSection | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    const versionMatch = VERSION_HEADING.exec(line);
    if (versionMatch) {
      entry = { version: versionMatch[1], date: versionMatch[2], sections: [] };
      section = null;
      entries.push(entry);
      continue;
    }
    if (!entry) continue;

    const sectionMatch = SECTION_HEADING.exec(line);
    if (sectionMatch) {
      section = { title: sectionMatch[1], items: [] };
      entry.sections.push(section);
      continue;
    }

    const itemMatch = LIST_ITEM.exec(line);
    if (itemMatch) {
      if (!section) {
        section = { title: "Changes", items: [] };
        entry.sections.push(section);
      }
      section.items.push(itemMatch[1]);
    }
  }

  return entries;
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  const file = path.join(process.cwd(), "CHANGELOG.md");
  const markdown = await readFile(file, "utf8");
  return parseChangelog(markdown);
}

export async function getLatestVersion(): Promise<string | null> {
  const entries = await getChangelog();
  return entries[0]?.version ?? null;
}
