// Builds a `%term%` LIKE pattern with wildcards and backslashes in the term escaped.
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

// Builds a `%term%` ILIKE value that is safe inside a PostgREST or=(...) filter:
// LIKE wildcards are escaped, then the whole value is double-quoted.
export function ilikeValue(term: string): string {
  return `"${likePattern(term).replace(/[\\"]/g, "\\$&")}"`;
}
