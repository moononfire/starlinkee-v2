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
