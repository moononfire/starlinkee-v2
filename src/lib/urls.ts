/**
 * Linktree link URLs are rendered as raw <a href> on public pages, so only
 * http(s) targets are allowed — anything else (javascript:, data:, …) is XSS.
 */
export function isSafeHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Post-login redirect targets (e.g. ?next=) must stay on this site: accept only
 * same-origin absolute paths, never "//host", "/\\host" or full URLs.
 */
export function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  // Reject control characters that browsers strip before parsing ("/\t/evil.com").
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
