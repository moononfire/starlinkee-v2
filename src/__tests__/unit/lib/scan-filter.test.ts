import { describe, it, expect } from "vitest";
import { isCountableScan } from "@/lib/scan-filter";

const headers = (init: Record<string, string>) => new Headers(init);

describe("isCountableScan()", () => {
  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ])("counts a real mobile browser", (ua) => {
    expect(isCountableScan(headers({ "user-agent": ua }))).toBe(true);
  });

  it.each([
    "WhatsApp/2.23.20.0",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "curl/8.4.0",
  ])("ignores %s", (ua) => {
    expect(isCountableScan(headers({ "user-agent": ua }))).toBe(false);
  });

  it("ignores an empty or missing user-agent", () => {
    expect(isCountableScan(headers({}))).toBe(false);
    expect(isCountableScan(headers({ "user-agent": "  " }))).toBe(false);
  });

  it("ignores prefetches", () => {
    const ua = "Mozilla/5.0 (iPhone) Safari/604.1";
    expect(isCountableScan(headers({ "user-agent": ua, "sec-purpose": "prefetch" }))).toBe(false);
    expect(isCountableScan(headers({ "user-agent": ua, purpose: "prefetch" }))).toBe(false);
    expect(isCountableScan(headers({ "user-agent": ua, "next-router-prefetch": "1" }))).toBe(false);
  });
});
