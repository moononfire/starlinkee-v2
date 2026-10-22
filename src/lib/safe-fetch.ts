import { lookup } from "dns/promises";
import { isIP } from "net";

const MAX_REDIRECTS = 3;
const MAX_BYTES = 1_000_000;

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only https URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error("URL resolves to a non-public address");
  }
  return url;
}

/**
 * GET a public https page for scraping: refuses private/link-local targets
 * (checked again on every redirect), caps redirects and body size.
 * Note: DNS is resolved here and again by fetch(), so a DNS-rebinding attacker
 * with control of a domain could still win the race; acceptable for an
 * admin-only helper.
 */
export async function fetchPublicHtml(rawUrl: string, init: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<string> {
  let url = await assertPublicHttpsUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      headers: init.headers,
      redirect: "manual",
      signal: AbortSignal.timeout(init.timeoutMs ?? 10_000),
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicHttpsUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }

    const reader = res.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    await reader.cancel().catch(() => {});
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new Error("Too many redirects");
}
