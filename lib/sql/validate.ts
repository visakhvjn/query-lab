const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|do\s+|comment|refresh|reindex|vacuum|analyze|cluster|lock|notify|listen|unlisten|discard|prepare|deallocate|security|set\s+role|reset\s+role|load|import)\b/i;

export function assertReadonlySelect(query: string): string {
  const cleaned = query
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (!cleaned) {
    throw new Error("Empty query");
  }

  const withoutTrailingSemi = cleaned.replace(/;+\s*$/g, "").trim();
  if (withoutTrailingSemi.includes(";")) {
    throw new Error("Multiple statements are not allowed");
  }

  if (!/^(with|select)\b/i.test(withoutTrailingSemi)) {
    throw new Error("Only SELECT or WITH … SELECT queries are allowed");
  }

  if (FORBIDDEN.test(withoutTrailingSemi)) {
    throw new Error("Query contains forbidden keywords");
  }

  if (/\bselect\b[\s\S]*\binto\b/i.test(withoutTrailingSemi)) {
    throw new Error("SELECT INTO is not allowed");
  }

  return withoutTrailingSemi;
}
