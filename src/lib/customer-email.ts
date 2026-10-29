/** Customer e-mails are matched case-insensitively: Supabase Auth stores them lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Escapes `%`, `_` and `\` so an e-mail can be used as an exact (case-insensitive) `ilike` pattern. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
