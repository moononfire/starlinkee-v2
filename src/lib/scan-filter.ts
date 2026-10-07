const NON_HUMAN_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|linkedin|embedly|headless|curl|wget|python-requests/i;

// Whether a request to the plate URL is a real physical scan worth counting:
// not a browser/router prefetch, and not a bot or link-preview fetcher.
export function isCountableScan(h: { get(name: string): string | null }): boolean {
  const purpose = `${h.get("sec-purpose") ?? ""} ${h.get("purpose") ?? ""}`;
  if (/prefetch/i.test(purpose) || h.get("next-router-prefetch")) return false;

  const ua = h.get("user-agent")?.trim();
  if (!ua) return false;
  return !NON_HUMAN_UA.test(ua);
}
