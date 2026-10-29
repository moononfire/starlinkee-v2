/** Customer e-mails are matched case-insensitively: Supabase Auth stores them lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Escapes `%`, `_` and `\` so an e-mail can be used as an (almost) exact, case-insensitive `ilike` pattern.
 * PostgREST turns `*` into `%` and has no way to escape it, so it becomes the single-char wildcard `_` here:
 * always pass the rows through `pickByEmail` to drop anything that is not the same address.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&").replace(/\*/g, "_");
}

/** First row whose e-mail is the same address (ignoring case and surrounding spaces); null if none. */
export function pickByEmail<T extends { email: string | null }>(rows: T[] | null | undefined, email: string): T | null {
  const wanted = normalizeEmail(email);
  return rows?.find((row) => row.email != null && normalizeEmail(row.email) === wanted) ?? null;
}
