import { describe, it, expect } from "vitest";
import { ownerLanguage, guestLanguage, languageFromCountry, dateLocale } from "./languages";

describe("ownerLanguage", () => {
  it("uses the customer's preferred language first", () => {
    expect(ownerLanguage({ preferred_language: "de" }, { plate_language: "pl" })).toBe("de");
  });
  it("falls back to the plate language, then English", () => {
    expect(ownerLanguage(null, { plate_language: "pl" })).toBe("pl");
    expect(ownerLanguage({ preferred_language: null }, null)).toBe("en");
    expect(ownerLanguage({ preferred_language: null }, { plate_language: "de" })).toBe("de");
  });
  it("returns Italian: portal and e-mails exist in it (no it -> en mapping)", () => {
    expect(ownerLanguage(null, { plate_language: "it" })).toBe("it");
    expect(ownerLanguage({ preferred_language: "it" }, null)).toBe("it");
    expect(ownerLanguage({ preferred_language: "it" }, { plate_language: "de" })).toBe("it");
  });
});

describe("guestLanguage", () => {
  it("prefers the guest's own choice", () => {
    expect(guestLanguage("it", { plate_language: "de" })).toBe("it");
  });
  it("ignores unknown choices and uses the plate language", () => {
    expect(guestLanguage("xx", { plate_language: "de" })).toBe("de");
    expect(guestLanguage(undefined, { plate_language: "it" })).toBe("it");
  });
  it("falls back to English", () => {
    expect(guestLanguage(null, null)).toBe("en");
  });
});

describe("languageFromCountry", () => {
  it("maps DE, PL and IT, everything else is English", () => {
    expect(languageFromCountry("DE")).toBe("de");
    expect(languageFromCountry("PL")).toBe("pl");
    expect(languageFromCountry("IT")).toBe("it");
    expect(languageFromCountry("FR")).toBe("en");
    expect(languageFromCountry(undefined)).toBe("en");
  });
});

describe("dateLocale", () => {
  it("gives Italian month names for it, not English", () => {
    const d = new Date(Date.UTC(2026, 9, 29, 12));
    expect(d.toLocaleDateString(dateLocale("it"), { month: "short", timeZone: "UTC" })).toBe("ott");
    expect(d.toLocaleDateString(dateLocale("it"), { timeZone: "UTC" })).toBe("29/10/2026");
  });
  it("maps the other languages and falls back to English", () => {
    expect(dateLocale("de")).toBe("de-DE");
    expect(dateLocale("pl")).toBe("pl-PL");
    expect(dateLocale("xx")).toBe("en-US");
    expect(dateLocale(undefined)).toBe("en-US");
  });
});
