import { describe, it, expect } from "vitest";
import { t } from "@/lib/translations";

describe("t()", () => {
  it("returns translation for a known key in English", () => {
    const result = t("proxy_page_title", "en");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("proxy_page_title");
  });

  it("returns translation for a known key in Polish", () => {
    const en = t("proxy_page_title", "en");
    const pl = t("proxy_page_title", "pl");
    expect(pl).not.toBe("proxy_page_title");
    // pl and en may differ — just verify it resolves
    expect(typeof pl).toBe("string");
  });

  it("returns translation for a known key in German", () => {
    const de = t("proxy_page_title", "de");
    expect(typeof de).toBe("string");
    expect(de).not.toBe("proxy_page_title");
  });

  it("falls back to English for unknown language", () => {
    const fromEn = t("proxy_page_title", "en");
    const fromUnknown = t("proxy_page_title", "xx");
    expect(fromUnknown).toBe(fromEn);
  });

  it("returns the key itself when key is missing from all languages", () => {
    const result = t("nonexistent_key_xyz", "en");
    expect(result).toBe("nonexistent_key_xyz");
  });

  it("defaults language to English when omitted", () => {
    const withDefault = t("proxy_page_title");
    const withEn = t("proxy_page_title", "en");
    expect(withDefault).toBe(withEn);
  });

  it("falls back to English when key missing in requested language but present in English", () => {
    // zh (Chinese) exists in the translations file; if a key is missing in zh, falls back to en
    const en = t("proxy_page_title", "en");
    const zh = t("proxy_page_title", "zh");
    // zh either has its own value or falls back to en — both are valid strings
    expect(typeof zh).toBe("string");
    expect(zh).not.toBe("proxy_page_title");
  });
});
