const STORAGE_PREFIX = "querylab:solved:";

function storageKey(schemaName: string): string {
  return `${STORAGE_PREFIX}${schemaName}`;
}

export function loadSolvedQuestions(schemaName: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(schemaName));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10);
  } catch {
    return [];
  }
}

export function markQuestionSolved(
  schemaName: string,
  questionNumber: number,
): number[] {
  const current = new Set(loadSolvedQuestions(schemaName));
  current.add(questionNumber);
  const next = [...current].sort((a, b) => a - b);
  try {
    window.localStorage.setItem(storageKey(schemaName), JSON.stringify(next));
  } catch {
    // Ignore quota / private mode failures; in-memory UI still updates.
  }
  return next;
}
